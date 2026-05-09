"use client";

import { useEffect, useMemo, useState } from "react";
import { AppNav } from "../components";
import { getCurrentSession, loadCurrentManager } from "../supabase-crm";

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
      } finally {
        setLoaded(true);
      }
    }

    load();
  }, []);

  const totals = useMemo(() => {
    const items = checklistGroups.flatMap((group) => group.items);
    const done = items.filter((item) => item.done).length;
    return { done, total: items.length, percent: Math.round((done / items.length) * 100) };
  }, []);

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

      <div className="checklist-grid">
        {checklistGroups.map((group) => (
          <section key={group.title} className="admin-card checklist-card">
            <h3>{group.title}</h3>
            <div className="checklist-items">
              {group.items.map((item) => (
                <article key={item.label} className={`checklist-item ${item.done ? "done" : ""}`}>
                  <span className="checkmark">{item.done ? "OK" : ""}</span>
                  <p>{item.label}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
