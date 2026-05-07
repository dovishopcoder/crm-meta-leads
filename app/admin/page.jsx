"use client";

import { useEffect, useState } from "react";
import { AppNav } from "../components";
import { countActiveLeadsForManager, createManager, createProduct, createStage, debugMetaConversation, getCurrentSession, loadAdminData, loadCurrentManager, transferActiveLeads, updateManager, updateProduct, updateStage } from "../supabase-crm";

export default function AdminPage() {
  const [currentManager, setCurrentManager] = useState(null);
  const [adminData, setAdminData] = useState({ managers: [], stages: [], products: [] });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [managerForm, setManagerForm] = useState({ name: "", email: "", password: "", role: "manager", color: "#1e8f72" });
  const [stageForm, setStageForm] = useState({ code: "", name: "", position: "" });
  const [productForm, setProductForm] = useState({ code: "", name: "" });
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [transferPrompt, setTransferPrompt] = useState(null);
  const [audienceFilters, setAudienceFilters] = useState({ stage: "all", manager: "all", product: "all", status: "active" });
  const [metaDebugForm, setMetaDebugForm] = useState({ pageId: "228763047857569", contactId: "9778373752196744" });
  const [metaDebugResult, setMetaDebugResult] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const session = await getCurrentSession();
        if (!session) {
          window.location.href = "/login";
          return;
        }

        const manager = await loadCurrentManager();
        if (manager?.role !== "admin") {
          window.location.href = "/";
          return;
        }

        setCurrentManager(manager);
        await refreshAdminData();
      } catch (err) {
        setError(err.message || "Nu s-au putut incarca setarile.");
      } finally {
        setLoaded(true);
      }
    }

    load();
  }, []);

  async function refreshAdminData() {
    setAdminData(await loadAdminData());
  }

  async function handleCreateManager(event) {
    event.preventDefault();
    await submitAdminAction(() => createManager(managerForm), "Manager adaugat si user creat in Supabase Auth.");
    setManagerForm({ name: "", email: "", password: "", role: "manager", color: "#1e8f72" });
  }

  async function handleCreateStage(event) {
    event.preventDefault();
    await submitAdminAction(() => createStage(stageForm), "Etapa adaugata.");
    setStageForm({ code: "", name: "", position: "" });
  }

  async function handleCreateProduct(event) {
    event.preventDefault();
    await submitAdminAction(() => createProduct(productForm), "Produs adaugat.");
    setProductForm({ code: "", name: "" });
  }

  async function submitAdminAction(action, successMessage) {
    setError("");
    setMessage("");
    try {
      await action();
      await refreshAdminData();
      setMessage(successMessage);
    } catch (err) {
      setError(err.message || "Nu s-a putut salva.");
    }
  }

  function startEdit(type, item) {
    setEditing({ type, id: item.id });
    setEditForm({ ...item });
    setMessage("");
    setError("");
  }

  async function saveEdit() {
    if (!editing) return;

    if (editing.type === "manager") {
      const originalManager = adminData.managers.find((manager) => manager.id === editing.id);
      if (originalManager?.active && editForm.active === false) {
        const activeLeadCount = await countActiveLeadsForManager(editing.id);
        if (activeLeadCount > 0) {
          setTransferPrompt({
            manager: originalManager,
            form: editForm,
            activeLeadCount,
            targetManagerId: ""
          });
          return;
        }
      }
    }

    const actions = {
      manager: () => updateManager(editing.id, editForm),
      stage: () => updateStage(editing.id, editForm),
      product: () => updateProduct(editing.id, editForm)
    };

    await submitAdminAction(actions[editing.type], "Modificarile au fost salvate.");
    setEditing(null);
    setEditForm({});
  }

  function cancelEdit() {
    setEditing(null);
    setEditForm({});
  }

  async function confirmTransferAndDeactivate() {
    if (!transferPrompt?.targetManagerId) {
      setError("Alege managerul catre care transferam lead-urile active.");
      return;
    }

    await submitAdminAction(async () => {
      await transferActiveLeads(transferPrompt.manager.id, transferPrompt.targetManagerId);
      await updateManager(transferPrompt.manager.id, transferPrompt.form);
    }, "Lead-urile active au fost transferate si managerul a fost dezactivat.");

    setTransferPrompt(null);
    setEditing(null);
    setEditForm({});
  }

  async function runMetaDebug(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setMetaDebugResult(null);

    try {
      setMetaDebugResult(await debugMetaConversation(metaDebugForm));
    } catch (err) {
      setError(err.message || "Nu s-a putut rula debug Meta.");
    }
  }

  if (!loaded) return null;

  return (
    <main className="admin-page-shell">
      <AppNav active="admin" manager={currentManager} />

      <section className="admin-hero">
        <div>
          <p className="eyebrow">Administrare</p>
          <h1>Setari CRM</h1>
        </div>
      </section>

      {error && <p className="modal-warning">{error}</p>}
      {message && <p className="success-message">{message}</p>}
      {transferPrompt && (
        <section className="transfer-box">
          <div>
            <p className="eyebrow">Transfer necesar</p>
            <h3>{transferPrompt.manager.name} are {transferPrompt.activeLeadCount} lead-uri active</h3>
          </div>
          <select
            value={transferPrompt.targetManagerId}
            onChange={(event) => setTransferPrompt({ ...transferPrompt, targetManagerId: event.target.value })}
          >
            <option value="">Alege manager activ</option>
            {adminData.managers
              .filter((manager) => manager.active && manager.id !== transferPrompt.manager.id)
              .map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
          </select>
          <div className="table-actions">
            <button className="primary-btn" type="button" onClick={confirmTransferAndDeactivate}>Transfera si dezactiveaza</button>
            <button className="ghost-btn" type="button" onClick={() => setTransferPrompt(null)}>Renunta</button>
          </div>
        </section>
      )}

      <div className="admin-grid">
        <section className="admin-card">
          <h3>Adauga manager</h3>
          <form className="admin-form" onSubmit={handleCreateManager}>
            <input value={managerForm.name} onChange={(event) => setManagerForm({ ...managerForm, name: event.target.value })} placeholder="Nume" required />
            <input type="email" value={managerForm.email} onChange={(event) => setManagerForm({ ...managerForm, email: event.target.value })} placeholder="Email" required />
            <input type="password" value={managerForm.password} onChange={(event) => setManagerForm({ ...managerForm, password: event.target.value })} placeholder="Parola temporara" minLength={6} required />
            <select value={managerForm.role} onChange={(event) => setManagerForm({ ...managerForm, role: event.target.value })}>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <input value={managerForm.color} onChange={(event) => setManagerForm({ ...managerForm, color: event.target.value })} placeholder="#1e8f72" />
            <button className="primary-btn" type="submit">Adauga</button>
          </form>
          <AdminTable
            title="Manageri"
            columns={["Nume", "Email", "Rol", "Activ"]}
            rows={adminData.managers}
            type="manager"
            editing={editing}
            editForm={editForm}
            onEdit={startEdit}
            onEditForm={setEditForm}
            onSave={saveEdit}
            onCancel={cancelEdit}
          />
        </section>

        <section className="admin-card">
          <h3>Adauga etapa</h3>
          <form className="admin-form" onSubmit={handleCreateStage}>
            <input value={stageForm.code} onChange={(event) => setStageForm({ ...stageForm, code: slugifyInput(event.target.value) })} placeholder="cod-etapa" required />
            <input value={stageForm.name} onChange={(event) => setStageForm({ ...stageForm, name: event.target.value })} placeholder="Nume etapa" required />
            <input type="number" value={stageForm.position} onChange={(event) => setStageForm({ ...stageForm, position: event.target.value })} placeholder="Pozitie" required />
            <button className="primary-btn" type="submit">Adauga</button>
          </form>
          <AdminTable
            title="Etape / palnie"
            columns={["Cod", "Nume", "Pozitie", "Activa"]}
            rows={adminData.stages}
            type="stage"
            editing={editing}
            editForm={editForm}
            onEdit={startEdit}
            onEditForm={setEditForm}
            onSave={saveEdit}
            onCancel={cancelEdit}
          />
        </section>

        <section className="admin-card">
          <h3>Adauga produs</h3>
          <form className="admin-form" onSubmit={handleCreateProduct}>
            <input value={productForm.code} onChange={(event) => setProductForm({ ...productForm, code: slugifyInput(event.target.value) })} placeholder="cod-produs" required />
            <input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} placeholder="Nume produs" required />
            <button className="primary-btn" type="submit">Adauga</button>
          </form>
          <AdminTable
            title="Produse propuse"
            columns={["Cod", "Nume", "Activ"]}
            rows={adminData.products}
            type="product"
            editing={editing}
            editForm={editForm}
            onEdit={startEdit}
            onEditForm={setEditForm}
            onSave={saveEdit}
            onCancel={cancelEdit}
          />
        </section>
      </div>

      <AudienceTable
        leads={adminData.audienceLeads || []}
        stages={adminData.stages}
        managers={adminData.managers}
        products={adminData.products}
        filters={audienceFilters}
        onFiltersChange={setAudienceFilters}
      />

      <section className="admin-card audience-card">
        <div className="archive-head">
          <div>
            <p className="eyebrow">Debug temporar</p>
            <h3>Meta conversation link</h3>
          </div>
        </div>
        <form className="admin-form debug-form" onSubmit={runMetaDebug}>
          <input value={metaDebugForm.pageId} onChange={(event) => setMetaDebugForm({ ...metaDebugForm, pageId: event.target.value })} placeholder="Page ID" required />
          <input value={metaDebugForm.contactId} onChange={(event) => setMetaDebugForm({ ...metaDebugForm, contactId: event.target.value })} placeholder="PSID / contact ID" required />
          <button className="primary-btn" type="submit">Ruleaza debug</button>
        </form>
        {metaDebugResult && <MetaDebugResult result={metaDebugResult} />}
      </section>
    </main>
  );
}

function slugifyInput(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function AdminTable({ title, columns, rows, type, editing, editForm, onEdit, onEditForm, onSave, onCancel }) {
  return (
    <section className="stats-table-card admin-card">
      <h3>{title}</h3>
      <table className="archive-table compact-table">
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}<th>Actiuni</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isEditing = editing?.type === type && editing.id === row.id;
            return (
              <tr key={row.id}>
                {isEditing ? (
                  <EditableCells type={type} form={editForm} onChange={onEditForm} />
                ) : (
                  <ReadOnlyCells type={type} row={row} />
                )}
                <td>
                  {isEditing ? (
                    <div className="table-actions">
                      <button className="mini-btn primary" type="button" onClick={onSave}>Salveaza</button>
                      <button className="mini-btn" type="button" onClick={onCancel}>Renunta</button>
                    </div>
                  ) : (
                    <button className="mini-btn primary" type="button" onClick={() => onEdit(type, row)}>Editeaza</button>
                  )}
                </td>
              </tr>
            );
          })}
          {!rows.length && <tr><td className="archive-empty" colSpan={columns.length + 1}>Nu exista date.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}

function AudienceTable({ leads, stages, managers, products, filters, onFiltersChange }) {
  const filteredLeads = leads.filter((lead) => {
    if (!lead.metaEmail && !lead.metaContactId) return false;
    if (filters.status === "active" && lead.archived) return false;
    if (filters.status === "archived" && !lead.archived) return false;
    if (filters.stage !== "all" && lead.stageCode !== filters.stage) return false;
    if (filters.manager !== "all" && lead.manager !== filters.manager) return false;
    if (filters.product !== "all" && !lead.products.includes(filters.product)) return false;
    return true;
  });

  function updateFilter(field, value) {
    onFiltersChange({ ...filters, [field]: value });
  }

  return (
    <section className="admin-card audience-card">
      <div className="archive-head">
        <div>
          <p className="eyebrow">Meta custom audience</p>
          <h3>Date tehnice pentru admin</h3>
        </div>
        <span className="count-badge">{filteredLeads.length}</span>
      </div>

      <div className="audience-filters">
        <select value={filters.stage} onChange={(event) => updateFilter("stage", event.target.value)}>
          <option value="all">Toate etapele</option>
          {stages.map((stage) => <option key={stage.id} value={stage.code}>{stage.name}</option>)}
        </select>
        <select value={filters.manager} onChange={(event) => updateFilter("manager", event.target.value)}>
          <option value="all">Toti managerii</option>
          {managers.map((manager) => <option key={manager.id} value={manager.name}>{manager.name}</option>)}
        </select>
        <select value={filters.product} onChange={(event) => updateFilter("product", event.target.value)}>
          <option value="all">Toate produsele</option>
          {products.map((product) => <option key={product.id} value={product.name}>{product.name}</option>)}
        </select>
        <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
          <option value="active">Doar active</option>
          <option value="archived">Doar arhivate</option>
          <option value="all">Toate</option>
        </select>
      </div>

      <div className="archive-table-wrap">
        <table className="archive-table audience-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Platforma</th>
              <th>Meta email</th>
              <th>Meta ID</th>
              <th>Email client</th>
              <th>Telefon</th>
              <th>Etapa</th>
              <th>Manager</th>
              <th>Produse</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => (
              <tr key={lead.id}>
                <td>{lead.name}</td>
                <td>{lead.platform}</td>
                <td>{lead.metaEmail || "-"}</td>
                <td>{lead.metaContactId || "-"}</td>
                <td>{lead.customerEmail || "-"}</td>
                <td>{lead.phone || "-"}</td>
                <td>{lead.stage}</td>
                <td>{lead.manager}</td>
                <td>{lead.products.length ? lead.products.join(", ") : "-"}</td>
              </tr>
            ))}
            {!filteredLeads.length && <tr><td className="archive-empty" colSpan={9}>Nu exista contacte pentru filtrul ales.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MetaDebugResult({ result }) {
  return (
    <div className="debug-result">
      <p>Conversatii gasite: {result.matches?.length || 0}</p>
      <div className="debug-links">
        {(result.links || []).map((link) => (
          <a key={`${link.label}-${link.selectedItemId}`} href={link.url} target="_blank" rel="noreferrer">
            {link.label}: {link.selectedItemId}
          </a>
        ))}
        {!result.links?.length && <span>Nu au fost generate linkuri.</span>}
      </div>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
}

function ReadOnlyCells({ type, row }) {
  if (type === "manager") {
    return (
      <>
        <td>{row.name}</td>
        <td>{row.email || "-"}</td>
        <td>{row.role}</td>
        <td>{row.active ? "Da" : "Nu"}</td>
      </>
    );
  }

  if (type === "stage") {
    return (
      <>
        <td>{row.code}</td>
        <td>{row.name}</td>
        <td>{row.position}</td>
        <td>{row.active ? "Da" : "Nu"}</td>
      </>
    );
  }

  return (
    <>
      <td>{row.code}</td>
      <td>{row.name}</td>
      <td>{row.active ? "Da" : "Nu"}</td>
    </>
  );
}

function EditableCells({ type, form, onChange }) {
  function update(field, value) {
    onChange({ ...form, [field]: value });
  }

  if (type === "manager") {
    return (
      <>
        <td><input className="table-input" value={form.name || ""} onChange={(event) => update("name", event.target.value)} /></td>
        <td><input className="table-input" value={form.email || ""} onChange={(event) => update("email", event.target.value)} /></td>
        <td><select className="table-input" value={form.role || "manager"} onChange={(event) => update("role", event.target.value)}><option value="manager">manager</option><option value="admin">admin</option></select></td>
        <td><select className="table-input" value={String(Boolean(form.active))} onChange={(event) => update("active", event.target.value === "true")}><option value="true">Da</option><option value="false">Nu</option></select></td>
      </>
    );
  }

  if (type === "stage") {
    return (
      <>
        <td><input className="table-input" value={form.code || ""} onChange={(event) => update("code", slugifyInput(event.target.value))} /></td>
        <td><input className="table-input" value={form.name || ""} onChange={(event) => update("name", event.target.value)} /></td>
        <td><input className="table-input" type="number" value={form.position || ""} onChange={(event) => update("position", event.target.value)} /></td>
        <td><select className="table-input" value={String(Boolean(form.active))} onChange={(event) => update("active", event.target.value === "true")}><option value="true">Da</option><option value="false">Nu</option></select></td>
      </>
    );
  }

  return (
    <>
      <td><input className="table-input" value={form.code || ""} onChange={(event) => update("code", slugifyInput(event.target.value))} /></td>
      <td><input className="table-input" value={form.name || ""} onChange={(event) => update("name", event.target.value)} /></td>
      <td><select className="table-input" value={String(Boolean(form.active))} onChange={(event) => update("active", event.target.value === "true")}><option value="true">Da</option><option value="false">Nu</option></select></td>
    </>
  );
}
