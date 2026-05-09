"use client";

import { useEffect, useMemo, useState } from "react";
import { AppNav } from "../components";
import {
  createProjectChecklistTask,
  deleteProjectChecklistTask,
  getCurrentSession,
  loadCurrentManager,
  loadProjectChecklistTasks,
  updateProjectChecklistTask
} from "../supabase-crm";

const checklistGroups = [
  {
    title: "Flux manageri",
    items: [
      { done: true, label: "Lead-urile noi apar in Necitite din webhook Meta." },
      { done: true, label: "Lead-ul nou cere link Meta direct inainte de prelucrare." },
      { done: true, label: "Managerul nu poate inchide lead-ul necitit fara follow-up." },
      { done: true, label: "Butonul Meta este disponibil doar dupa deschiderea detaliilor clientului." },
      { done: false, label: "Test complet cu fiecare manager real: login, link, follow-up, salvare." }
    ]
  },
  {
    title: "Meta si date client",
    items: [
      { done: true, label: "PSID si Meta email se salveaza separat de emailul clientului." },
      { done: true, label: "Poza clientului se incarca prin proxy Meta avatar." },
      { done: false, label: "Stabilim procedura interna pentru copierea linkului direct din Business Suite." },
      { done: false, label: "Test separat pentru lead-uri Instagram." }
    ]
  },
  {
    title: "Setari admin",
    items: [
      { done: true, label: "Adminul poate adauga manageri si useri de login din CRM." },
      { done: true, label: "Adminul poate administra etape si produse." },
      { done: true, label: "Managerii inactivi pot fi gestionati cu transfer de lead-uri." },
      { done: false, label: "Definim lista finala de etape/palnie si produse propuse." }
    ]
  },
  {
    title: "Statistici si export",
    items: [
      { done: true, label: "Pagina Statistici exista separat de CRM." },
      { done: true, label: "Tabel Meta Custom Audience exista in Setari." },
      { done: false, label: "Export CSV pentru Custom Audience." },
      { done: false, label: "Raport mai clar pe manager: cate lead-uri procesate pe perioada." }
    ]
  },
  {
    title: "Lansare",
    items: [
      { done: true, label: "Aplicatia este publicata pe Vercel." },
      { done: true, label: "Baza de date ruleaza in Supabase." },
      { done: false, label: "Curatarea lead-urilor demo inainte de folosire reala." },
      { done: false, label: "Document scurt pentru manageri: cum se prelucreaza un lead." },
      { done: false, label: "Test final pe telefon si desktop cu 2-3 manageri." }
    ]
  }
];

export default function ChecklistPage() {
  const [currentManager, setCurrentManager] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [customTasks, setCustomTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskSection, setNewTaskSection] = useState(checklistGroups[0].title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
        try {
          const tasks = await loadProjectChecklistTasks();
          setCustomTasks(tasks);
        } catch (taskError) {
          setError("Checklist-ul editabil are nevoie de tabelul project_checklist_tasks in Supabase.");
        }
      } finally {
        setLoaded(true);
      }
    }

    load();
  }, []);

  const groups = useMemo(() => checklistGroups.map((group) => ({
    ...group,
    items: [
      ...group.items.map((item) => ({ ...item, source: "system" })),
      ...customTasks
        .filter((task) => task.section === group.title)
        .map((task) => ({ id: task.id, done: task.done, label: task.title, source: "custom" }))
    ]
  })), [customTasks]);

  const totals = useMemo(() => {
    const items = groups.flatMap((group) => group.items);
    const done = items.filter((item) => item.done).length;
    return { done, total: items.length, percent: Math.round((done / items.length) * 100) };
  }, [groups]);

  async function handleAddTask(event) {
    event.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;

    setSaving(true);
    setError("");
    try {
      const task = await createProjectChecklistTask({ section: newTaskSection, title });
      setCustomTasks((tasks) => [...tasks, task]);
      setNewTaskTitle("");
    } catch (addError) {
      setError(addError.message || "Nu s-a putut adauga taskul.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleTask(task) {
    setError("");
    try {
      const updated = await updateProjectChecklistTask(task.id, { done: !task.done });
      setCustomTasks((tasks) => tasks.map((item) => item.id === updated.id ? updated : item));
    } catch (toggleError) {
      setError(toggleError.message || "Nu s-a putut actualiza taskul.");
    }
  }

  async function handleDeleteTask(taskId) {
    setError("");
    try {
      await deleteProjectChecklistTask(taskId);
      setCustomTasks((tasks) => tasks.filter((task) => task.id !== taskId));
    } catch (deleteError) {
      setError(deleteError.message || "Nu s-a putut sterge taskul.");
    }
  }

  if (!loaded) return null;

  return (
    <main className="checklist-page-shell">
      <AppNav active="checklist" manager={currentManager} />

      <section className="admin-hero">
        <div>
          <p className="eyebrow">Finalizare proiect</p>
          <h1>Checklist CRM</h1>
        </div>
        <div className="checklist-progress">
          <strong>{totals.percent}%</strong>
          <span>{totals.done} din {totals.total} puncte</span>
        </div>
      </section>

      <section className="admin-card checklist-add-card">
        <form className="checklist-form" onSubmit={handleAddTask}>
          <select value={newTaskSection} onChange={(event) => setNewTaskSection(event.target.value)}>
            {checklistGroups.map((group) => <option key={group.title} value={group.title}>{group.title}</option>)}
          </select>
          <input
            value={newTaskTitle}
            onChange={(event) => setNewTaskTitle(event.target.value)}
            placeholder="Scrie un task nou..."
          />
          <button type="submit" disabled={saving || !newTaskTitle.trim()}>{saving ? "Se salveaza..." : "Adauga task"}</button>
        </form>
        {error && <p className="checklist-error">{error}</p>}
      </section>

      <div className="checklist-grid">
        {groups.map((group) => (
          <section key={group.title} className="admin-card checklist-card">
            <h3>{group.title}</h3>
            <div className="checklist-items">
              {group.items.map((item) => (
                <article key={`${item.source}-${item.id || item.label}`} className={`checklist-item ${item.done ? "done" : ""}`}>
                  <button
                    type="button"
                    className="checkmark"
                    disabled={item.source !== "custom"}
                    onClick={() => handleToggleTask(item)}
                    aria-label={item.done ? "Marcheaza taskul ca nefacut" : "Marcheaza taskul ca facut"}
                  >
                    {item.done ? "OK" : ""}
                  </button>
                  <p>{item.label}</p>
                  {item.source === "custom" && (
                    <button type="button" className="ghost-btn checklist-delete" onClick={() => handleDeleteTask(item.id)}>
                      Sterge
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
