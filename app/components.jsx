import Link from "next/link";
import { signOut } from "./supabase-crm";

export function AppNav({ active, manager }) {
  async function handleLogout() {
    await signOut();
    window.location.href = "/login";
  }

  return (
    <nav className="app-nav" aria-label="Navigare aplicatie">
      <Link className={active === "crm" ? "active" : ""} href="/">CRM</Link>
      <Link className={active === "stats" ? "active" : ""} href="/stats">Statistici</Link>
      {manager?.role === "admin" && <Link className={active === "admin" ? "active" : ""} href="/admin">Admin</Link>}
      {manager && <span className="nav-user">{manager.name} · {manager.role === "admin" ? "Admin" : "Manager"}</span>}
      {manager && <button type="button" onClick={handleLogout}>Logout</button>}
    </nav>
  );
}

export function StatsPanel({ stats }) {
  return (
    <section className="stats-panel stats-page-panel" aria-label="Statistici CRM">
      <div className="archive-head">
        <div>
          <p className="eyebrow">Statistica</p>
          <h2>Performanta manageri si etape</h2>
        </div>
      </div>
      <div className="stats-cards">
        {stats.cards.map((card) => <article key={card.label} className="stat-card"><span>{card.label}</span><strong>{card.value}</strong></article>)}
      </div>
      <div className="stats-layout">
        <StatsTable title="Manageri" columns={["Manager", "Lead-uri", "Prelucrari", "Necitite", "Arhivate"]} rows={stats.managers} />
        <StatsTable title="Etape / Tags" columns={["Etapa", "Lead-uri", "Prelucrari"]} rows={stats.stages} />
        <StatsTable title="Produse propuse" columns={["Produs", "Propuneri", "Acceptate"]} rows={stats.products} />
      </div>
    </section>
  );
}

function StatsTable({ title, columns, rows }) {
  return (
    <div className="stats-table-card">
      <h3>{title}</h3>
      <table className="archive-table compact-table">
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={`${title}-${index}`}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
