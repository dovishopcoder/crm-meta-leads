"use client";

import { useEffect, useState } from "react";
import { AppNav } from "../components";
import { countActiveLeadsForManager, createCurrentInterest, createHook, createLeadStatus, createManager, createNeedCategory, createOrganization, createProduct, createReligion, createStage, deleteAdminSetting, deleteManager, getCurrentSession, loadAdminData, loadCurrentManager, reorderAdminSettings, resetManagerPassword, transferActiveLeads, updateCurrentInterest, updateHook, updateLeadStatus, updateManager, updateNeedCategory, updateOrganization, updateProduct, updateReligion, updateStage } from "../supabase-crm";

export default function AdminPage() {
  const [currentManager, setCurrentManager] = useState(null);
  const [adminData, setAdminData] = useState({ managers: [], organizations: [], globalAdmin: false, stages: [], products: [], statuses: [], religions: [], hooks: [], currentInterests: [], needCategories: [] });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [managerForm, setManagerForm] = useState({ name: "", email: "", password: "", role: "manager", color: "#1e8f72", organizationId: "" });
  const [organizationForm, setOrganizationForm] = useState({ name: "", slug: "", metaPageId: "", manychatPageId: "" });
  const [stageForm, setStageForm] = useState({ code: "", name: "", position: "" });
  const [productForm, setProductForm] = useState({ code: "", name: "" });
  const [statusForm, setStatusForm] = useState({ code: "", name: "", position: "" });
  const [religionForm, setReligionForm] = useState({ code: "", name: "", position: "" });
  const [hookForm, setHookForm] = useState({ code: "", name: "", position: "" });
  const [currentInterestForm, setCurrentInterestForm] = useState({ code: "", name: "", position: "" });
  const [needCategoryForm, setNeedCategoryForm] = useState({ code: "", name: "", position: "" });
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [passwordDrafts, setPasswordDrafts] = useState({});
  const [transferPrompt, setTransferPrompt] = useState(null);
  const [draggedSetting, setDraggedSetting] = useState(null);
  const [audienceFilters, setAudienceFilters] = useState({ stage: "all", manager: "all", product: "all", status: "active" });

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
    await submitAdminAction(() => createManager(managerForm), "Manager adaugat si user creat in autentificare.");
    setManagerForm({ name: "", email: "", password: "", role: "manager", color: "#1e8f72", organizationId: adminData.organization?.id || "" });
  }

  async function handleCreateOrganization(event) {
    event.preventDefault();
    await submitAdminAction(async () => {
      const organization = await createOrganization(organizationForm);
      setAdminData((current) => ({ ...current, organizations: [...(current.organizations || []), organization] }));
    }, "Organizatia a fost creata.", { refresh: false });
    setOrganizationForm({ name: "", slug: "", metaPageId: "", manychatPageId: "" });
  }

  async function handleCreateStage(event) {
    event.preventDefault();
    await submitAdminAction(async () => {
      const stage = await createStage(stageForm);
      addSettingRow("stages", stage);
    }, "Etapa adaugata.", { refresh: false });
    setStageForm({ code: "", name: "", position: "" });
  }

  async function handleCreateProduct(event) {
    event.preventDefault();
    await submitAdminAction(async () => {
      const product = await createProduct(productForm);
      addSettingRow("products", product);
    }, "Produs adaugat.", { refresh: false });
    setProductForm({ code: "", name: "" });
  }

  async function handleCreateStatus(event) {
    event.preventDefault();
    await submitAdminAction(async () => {
      const status = await createLeadStatus(statusForm);
      addSettingRow("statuses", status);
    }, "Status adaugat.", { refresh: false });
    setStatusForm({ code: "", name: "", position: "" });
  }

  async function handleCreateReligion(event) {
    event.preventDefault();
    await submitAdminAction(async () => {
      const religion = await createReligion(religionForm);
      addSettingRow("religions", religion);
    }, "Religie adaugata.", { refresh: false });
    setReligionForm({ code: "", name: "", position: "" });
  }

  async function handleCreateHook(event) {
    event.preventDefault();
    await submitAdminAction(async () => {
      const hook = await createHook(hookForm);
      addSettingRow("hooks", hook);
    }, "Hook adaugat.", { refresh: false });
    setHookForm({ code: "", name: "", position: "" });
  }

  async function handleCreateCurrentInterest(event) {
    event.preventDefault();
    await submitAdminAction(async () => {
      const interest = await createCurrentInterest(currentInterestForm);
      addSettingRow("currentInterests", interest);
    }, "Interes actual adaugat.", { refresh: false });
    setCurrentInterestForm({ code: "", name: "", position: "" });
  }

  async function handleCreateNeedCategory(event) {
    event.preventDefault();
    await submitAdminAction(async () => {
      const category = await createNeedCategory(needCategoryForm);
      addSettingRow("needCategories", category);
    }, "Need category adaugata.", { refresh: false });
    setNeedCategoryForm({ code: "", name: "", position: "" });
  }

  function addSettingRow(key, row) {
    if (!row?.id) return;
    setAdminData((current) => ({
      ...current,
      [key]: [...(current[key] || []).filter((item) => item.id !== row.id), row].sort((left, right) => Number(left.position || 0) - Number(right.position || 0))
    }));
  }

  async function submitAdminAction(action, successMessage, options = {}) {
    setError("");
    setMessage("");
    try {
      await action();
      if (options.refresh !== false) await refreshAdminData();
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
      organization: () => updateOrganization(editing.id, editForm),
      stage: () => updateStage(editing.id, editForm),
      product: () => updateProduct(editing.id, editForm),
      status: () => updateLeadStatus(editing.id, editForm),
      religion: () => updateReligion(editing.id, editForm),
      hook: () => updateHook(editing.id, editForm),
      currentInterest: () => updateCurrentInterest(editing.id, editForm),
      needCategory: () => updateNeedCategory(editing.id, editForm)
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

  async function handleDeleteManager(manager) {
    if (manager.id === currentManager?.id) {
      setError("Nu poti sterge adminul cu care esti logat.");
      return;
    }

    const confirmed = window.confirm(`Stergi managerul ${manager.name}? Lead-urile lui vor ramane in CRM ca neatribuite.`);
    if (!confirmed) return;

    await submitAdminAction(() => deleteManager(manager.id), "Managerul a fost sters.");
  }

  async function handleDeleteSetting(type, row) {
    const labels = {
      stage: "etapa",
      product: "produsul",
      status: "statusul",
      religion: "religia",
      hook: "hook-ul",
      currentInterest: "interesul actual",
      needCategory: "need category",
      organization: "organizatia"
    };
    const confirmed = window.confirm(`Stergi ${labels[type] || "setarea"} "${row.name}"?`);
    if (!confirmed) return;

    await submitAdminAction(() => deleteAdminSetting(type, row.id), "Setarea a fost stearsa.");
    if (editing?.type === type && editing.id === row.id) cancelEdit();
  }

  async function handleResetPassword(manager) {
    const password = passwordDrafts[manager.id] || "";
    await submitAdminAction(() => resetManagerPassword(manager.id, password), `Parola pentru ${manager.name} a fost schimbata.`);
    setPasswordDrafts((drafts) => ({ ...drafts, [manager.id]: "" }));
  }

  async function handleReorderSetting(type, targetRow) {
    if (!draggedSetting || draggedSetting.type !== type || draggedSetting.id === targetRow.id) return;

    const key = settingKeyForType(type);
    const rows = adminData[key] || [];
    const fromIndex = rows.findIndex((row) => row.id === draggedSetting.id);
    const toIndex = rows.findIndex((row) => row.id === targetRow.id);
    if (fromIndex < 0 || toIndex < 0) return;

    const nextRows = [...rows];
    const [moved] = nextRows.splice(fromIndex, 1);
    nextRows.splice(toIndex, 0, moved);
    const withPositions = nextRows.map((row, index) => ({ ...row, position: index + 1 }));

    setDraggedSetting(null);
    setAdminData((current) => ({ ...current, [key]: withPositions }));
    await submitAdminAction(() => reorderAdminSettings(type, withPositions), "Ordinea a fost actualizata.", { refresh: false });
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
        {adminData.globalAdmin && (
          <section className="admin-card">
            <h3>Adauga organizatie</h3>
            <form className="admin-form" onSubmit={handleCreateOrganization} autoComplete="off">
              <input value={organizationForm.name} onChange={(event) => setOrganizationForm({ ...organizationForm, name: event.target.value, slug: organizationForm.slug || slugifyInput(event.target.value) })} placeholder="Nume organizatie" required />
              <input value={organizationForm.slug} onChange={(event) => setOrganizationForm({ ...organizationForm, slug: slugifyInput(event.target.value) })} placeholder="slug-organizatie" required />
              <input value={organizationForm.metaPageId} onChange={(event) => setOrganizationForm({ ...organizationForm, metaPageId: event.target.value })} placeholder="Meta Page ID" />
              <input value={organizationForm.manychatPageId} onChange={(event) => setOrganizationForm({ ...organizationForm, manychatPageId: event.target.value })} placeholder="ManyChat/Page ID" />
              <button className="primary-btn" type="submit">Adauga organizatie</button>
            </form>
            <AdminTable
              title="Organizatii"
              columns={["Nume", "Slug", "Meta Page ID", "ManyChat Page ID", "Activa"]}
              rows={adminData.organizations || []}
              type="organization"
              editing={editing}
              editForm={editForm}
              onEdit={startEdit}
              onEditForm={setEditForm}
              onSave={saveEdit}
              onCancel={cancelEdit}
              onDelete={handleDeleteSetting}
            />
          </section>
        )}

        <section className="admin-card">
          <h3>Adauga manager</h3>
          <form className="admin-form" onSubmit={handleCreateManager} autoComplete="off">
            <input autoComplete="off" value={managerForm.name} onChange={(event) => setManagerForm({ ...managerForm, name: event.target.value })} placeholder="Nume manager" required />
            <input autoComplete="new-email" type="email" value={managerForm.email} onChange={(event) => setManagerForm({ ...managerForm, email: event.target.value })} placeholder="Email manager" required />
            <input autoComplete="new-password" type="password" value={managerForm.password} onChange={(event) => setManagerForm({ ...managerForm, password: event.target.value })} placeholder="Parola temporara" minLength={6} required />
            <select value={managerForm.role} onChange={(event) => setManagerForm({ ...managerForm, role: event.target.value })}>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            {adminData.globalAdmin && (
              <select value={managerForm.organizationId} onChange={(event) => setManagerForm({ ...managerForm, organizationId: event.target.value })}>
                <option value="">Organizatia curenta</option>
                {(adminData.organizations || []).filter((org) => org.active !== false).map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
              </select>
            )}
            <label className="color-field">
              Culoare
              <input type="color" value={managerForm.color} onChange={(event) => setManagerForm({ ...managerForm, color: event.target.value })} />
            </label>
            <button className="primary-btn" type="submit">Adauga</button>
          </form>
          <AdminTable
            title="Manageri"
            columns={adminData.globalAdmin ? ["Nume", "Email", "Rol", "Organizatie", "Activ"] : ["Nume", "Email", "Rol", "Activ"]}
            rows={adminData.managers}
            type="manager"
            editing={editing}
            editForm={editForm}
            onEdit={startEdit}
            onEditForm={setEditForm}
            onSave={saveEdit}
            onCancel={cancelEdit}
            onDelete={handleDeleteManager}
            onPasswordChange={(managerId, password) => setPasswordDrafts((drafts) => ({ ...drafts, [managerId]: password }))}
            onPasswordReset={handleResetPassword}
            passwordDrafts={passwordDrafts}
            currentManagerId={currentManager?.id}
            organizations={adminData.organizations || []}
            globalAdmin={adminData.globalAdmin}
          />
        </section>

        <section className="admin-card">
          <h3>Adauga status</h3>
          <form className="admin-form" onSubmit={handleCreateStatus}>
            <input value={statusForm.code} onChange={(event) => setStatusForm({ ...statusForm, code: slugifyInput(event.target.value) })} placeholder="cod-status" required />
            <input value={statusForm.name} onChange={(event) => setStatusForm({ ...statusForm, name: event.target.value })} placeholder="Nume status" required />
            <button className="primary-btn" type="submit">Adauga</button>
          </form>
          <AdminTable
            title="Status lead"
            columns={["Cod", "Nume", "Activ"]}
            rows={adminData.statuses}
            type="status"
            editing={editing}
            editForm={editForm}
            onEdit={startEdit}
            onEditForm={setEditForm}
            onSave={saveEdit}
            onCancel={cancelEdit}
            onDelete={handleDeleteSetting}
            draggedSetting={draggedSetting}
            onDragStart={setDraggedSetting}
            onDropRow={handleReorderSetting}
          />
        </section>

        <section className="admin-card">
          <h3>Adauga hook</h3>
          <form className="admin-form" onSubmit={handleCreateHook}>
            <input value={hookForm.code} onChange={(event) => setHookForm({ ...hookForm, code: slugifyInput(event.target.value) })} placeholder="cod-hook" required />
            <input value={hookForm.name} onChange={(event) => setHookForm({ ...hookForm, name: event.target.value })} placeholder="Nume hook" required />
            <button className="primary-btn" type="submit">Adauga</button>
          </form>
          <AdminTable
            title="Hook-uri"
            columns={["Cod", "Nume", "Activ"]}
            rows={adminData.hooks}
            type="hook"
            editing={editing}
            editForm={editForm}
            onEdit={startEdit}
            onEditForm={setEditForm}
            onSave={saveEdit}
            onCancel={cancelEdit}
            onDelete={handleDeleteSetting}
            draggedSetting={draggedSetting}
            onDragStart={setDraggedSetting}
            onDropRow={handleReorderSetting}
          />
        </section>

        <section className="admin-card">
          <h3>Adauga interes actual</h3>
          <form className="admin-form" onSubmit={handleCreateCurrentInterest}>
            <input value={currentInterestForm.code} onChange={(event) => setCurrentInterestForm({ ...currentInterestForm, code: slugifyInput(event.target.value) })} placeholder="cod-interes" required />
            <input value={currentInterestForm.name} onChange={(event) => setCurrentInterestForm({ ...currentInterestForm, name: event.target.value })} placeholder="Nume interes" required />
            <button className="primary-btn" type="submit">Adauga</button>
          </form>
          <AdminTable
            title="Interes actual"
            columns={["Cod", "Nume", "Activ"]}
            rows={adminData.currentInterests}
            type="currentInterest"
            editing={editing}
            editForm={editForm}
            onEdit={startEdit}
            onEditForm={setEditForm}
            onSave={saveEdit}
            onCancel={cancelEdit}
            onDelete={handleDeleteSetting}
            draggedSetting={draggedSetting}
            onDragStart={setDraggedSetting}
            onDropRow={handleReorderSetting}
          />
        </section>

        <section className="admin-card">
          <h3>Adauga need category</h3>
          <form className="admin-form" onSubmit={handleCreateNeedCategory}>
            <input value={needCategoryForm.code} onChange={(event) => setNeedCategoryForm({ ...needCategoryForm, code: slugifyInput(event.target.value) })} placeholder="cod-categorie" required />
            <input value={needCategoryForm.name} onChange={(event) => setNeedCategoryForm({ ...needCategoryForm, name: event.target.value })} placeholder="Nume categorie" required />
            <button className="primary-btn" type="submit">Adauga</button>
          </form>
          <AdminTable
            title="Need Category"
            columns={["Cod", "Nume", "Activ"]}
            rows={adminData.needCategories}
            type="needCategory"
            editing={editing}
            editForm={editForm}
            onEdit={startEdit}
            onEditForm={setEditForm}
            onSave={saveEdit}
            onCancel={cancelEdit}
            onDelete={handleDeleteSetting}
            draggedSetting={draggedSetting}
            onDragStart={setDraggedSetting}
            onDropRow={handleReorderSetting}
          />
        </section>

        <section className="admin-card">
          <h3>Adauga religie</h3>
          <form className="admin-form" onSubmit={handleCreateReligion}>
            <input value={religionForm.code} onChange={(event) => setReligionForm({ ...religionForm, code: slugifyInput(event.target.value) })} placeholder="cod-religie" required />
            <input value={religionForm.name} onChange={(event) => setReligionForm({ ...religionForm, name: event.target.value })} placeholder="Nume religie" required />
            <button className="primary-btn" type="submit">Adauga</button>
          </form>
          <AdminTable
            title="Religii"
            columns={["Cod", "Nume", "Activa"]}
            rows={adminData.religions}
            type="religion"
            editing={editing}
            editForm={editForm}
            onEdit={startEdit}
            onEditForm={setEditForm}
            onSave={saveEdit}
            onCancel={cancelEdit}
            onDelete={handleDeleteSetting}
            draggedSetting={draggedSetting}
            onDragStart={setDraggedSetting}
            onDropRow={handleReorderSetting}
          />
        </section>

        <section className="admin-card">
          <h3>Adauga etapa</h3>
          <form className="admin-form" onSubmit={handleCreateStage}>
            <input value={stageForm.code} onChange={(event) => setStageForm({ ...stageForm, code: slugifyInput(event.target.value) })} placeholder="cod-etapa" required />
            <input value={stageForm.name} onChange={(event) => setStageForm({ ...stageForm, name: event.target.value })} placeholder="Nume etapa" required />
            <button className="primary-btn" type="submit">Adauga</button>
          </form>
          <AdminTable
            title="Etape / palnie"
            columns={["Cod", "Nume", "Activa"]}
            rows={adminData.stages}
            type="stage"
            editing={editing}
            editForm={editForm}
            onEdit={startEdit}
            onEditForm={setEditForm}
            onSave={saveEdit}
            onCancel={cancelEdit}
            onDelete={handleDeleteSetting}
            draggedSetting={draggedSetting}
            onDragStart={setDraggedSetting}
            onDropRow={handleReorderSetting}
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
            onDelete={handleDeleteSetting}
            draggedSetting={draggedSetting}
            onDragStart={setDraggedSetting}
            onDropRow={handleReorderSetting}
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

    </main>
  );
}

function slugifyInput(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function settingKeyForType(type) {
  return {
    stage: "stages",
    product: "products",
    status: "statuses",
    religion: "religions",
    hook: "hooks",
    currentInterest: "currentInterests",
    needCategory: "needCategories"
  }[type];
}

function AdminTable({ title, columns, rows, type, editing, editForm, onEdit, onEditForm, onSave, onCancel, onDelete, onPasswordChange, onPasswordReset, passwordDrafts = {}, currentManagerId, draggedSetting, onDragStart, onDropRow, organizations = [], globalAdmin = false }) {
  const canReorder = type !== "manager" && type !== "organization";

  return (
    <section className="stats-table-card admin-card">
      <h3>{title}</h3>
      <table className="archive-table compact-table">
        <thead>
          <tr>{canReorder && <th>Ordine</th>}{columns.map((column) => <th key={column}>{column}</th>)}<th>Actiuni</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isEditing = editing?.type === type && editing.id === row.id;
            const isDragging = draggedSetting?.type === type && draggedSetting.id === row.id;
            return (
              <tr
                key={row.id}
                className={isDragging ? "drag-row-active" : ""}
                draggable={canReorder}
                onDragStart={(event) => {
                  if (!canReorder) return;
                  event.dataTransfer.setData("text/plain", row.id);
                  onDragStart?.({ type, id: row.id });
                }}
                onDragOver={(event) => canReorder && event.preventDefault()}
                onDrop={() => canReorder && onDropRow?.(type, row)}
              >
                {canReorder && <td><span className="drag-handle" title="Trage pentru a schimba ordinea">drag</span></td>}
                {isEditing ? (
                  <EditableCells type={type} form={editForm} onChange={onEditForm} organizations={organizations} globalAdmin={globalAdmin} />
                ) : (
                  <ReadOnlyCells type={type} row={row} globalAdmin={globalAdmin} />
                )}
                <td>
                  {isEditing ? (
                    <div className="table-actions">
                      <button className="mini-btn primary" type="button" onClick={onSave}>Salveaza</button>
                      <button className="mini-btn" type="button" onClick={onCancel}>Renunta</button>
                    </div>
                  ) : (
                    <div className="table-actions">
                      <button className="mini-btn primary" type="button" onClick={() => onEdit(type, row)}>Editeaza</button>
                      {type === "manager" && (
                        <>
                          <input
                            className="table-input password-reset-input"
                            type="password"
                            minLength={6}
                            value={passwordDrafts[row.id] || ""}
                            onChange={(event) => onPasswordChange(row.id, event.target.value)}
                            placeholder="Parola noua"
                          />
                          <button className="mini-btn" type="button" onClick={() => onPasswordReset(row)} disabled={(passwordDrafts[row.id] || "").length < 6}>Schimba parola</button>
                        </>
                      )}
                      {onDelete && (type !== "manager" || row.id !== currentManagerId) && (
                        <button className="mini-btn danger" type="button" onClick={() => (type === "manager" ? onDelete(row) : onDelete(type, row))}>Sterge</button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
          {!rows.length && <tr><td className="archive-empty" colSpan={columns.length + (canReorder ? 2 : 1)}>Nu exista date.</td></tr>}
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

function ReadOnlyCells({ type, row }) {
  if (type === "manager") {
    return (
      <>
        <td>{row.name}</td>
        <td>{row.email || "-"}</td>
        <td>{row.role}</td>
        {globalAdmin && <td>{row.organizations?.name || "-"}</td>}
        <td>{row.active ? "Da" : "Nu"}</td>
      </>
    );
  }

  if (type === "organization") {
    return (
      <>
        <td>{row.name}</td>
        <td>{row.slug}</td>
        <td>{row.meta_page_id || "-"}</td>
        <td>{row.manychat_page_id || "-"}</td>
        <td>{row.active ? "Da" : "Nu"}</td>
      </>
    );
  }

  if (type === "stage" || type === "status" || type === "religion" || type === "hook" || type === "currentInterest" || type === "needCategory") {
    return (
      <>
        <td>{row.code}</td>
        <td>{row.name}</td>
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

function EditableCells({ type, form, onChange, organizations = [], globalAdmin = false }) {
  function update(field, value) {
    onChange({ ...form, [field]: value });
  }

  if (type === "manager") {
    return (
      <>
        <td><input className="table-input" value={form.name || ""} onChange={(event) => update("name", event.target.value)} /></td>
        <td><input className="table-input" value={form.email || ""} onChange={(event) => update("email", event.target.value)} /></td>
        <td><select className="table-input" value={form.role || "manager"} onChange={(event) => update("role", event.target.value)}><option value="manager">manager</option><option value="admin">admin</option></select></td>
        {globalAdmin && (
          <td>
            <select className="table-input" value={form.organizationId || form.organization_id || ""} onChange={(event) => update("organizationId", event.target.value)}>
              <option value="">Fara organizatie</option>
              {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
            </select>
          </td>
        )}
        <td><select className="table-input" value={String(Boolean(form.active))} onChange={(event) => update("active", event.target.value === "true")}><option value="true">Da</option><option value="false">Nu</option></select></td>
      </>
    );
  }

  if (type === "organization") {
    return (
      <>
        <td><input className="table-input" value={form.name || ""} onChange={(event) => update("name", event.target.value)} /></td>
        <td><input className="table-input" value={form.slug || ""} onChange={(event) => update("slug", slugifyInput(event.target.value))} /></td>
        <td><input className="table-input" value={form.metaPageId || form.meta_page_id || ""} onChange={(event) => update("metaPageId", event.target.value)} /></td>
        <td><input className="table-input" value={form.manychatPageId || form.manychat_page_id || ""} onChange={(event) => update("manychatPageId", event.target.value)} /></td>
        <td><select className="table-input" value={String(Boolean(form.active))} onChange={(event) => update("active", event.target.value === "true")}><option value="true">Da</option><option value="false">Nu</option></select></td>
      </>
    );
  }

  if (type === "stage" || type === "status" || type === "religion" || type === "hook" || type === "currentInterest" || type === "needCategory") {
    return (
      <>
        <td><input className="table-input" value={form.code || ""} onChange={(event) => update("code", slugifyInput(event.target.value))} /></td>
        <td><input className="table-input" value={form.name || ""} onChange={(event) => update("name", event.target.value)} /></td>
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

