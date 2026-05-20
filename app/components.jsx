"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "./supabase-crm";

export function AppNav({ active, manager, systemStatus = "ok" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;

    function closeOnOutsideClick(event) {
      if (!navRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  async function handleLogout() {
    await signOut();
    window.location.href = "/login";
  }

  const userLabel = `${manager?.name} - ${manager?.role === "admin" ? "Admin" : "Manager"}`;
  const statusLabel = systemStatus === "error" ? "Eroare" : "Conectat";

  return (
    <nav ref={navRef} className="app-nav" aria-label="Navigare aplicatie">
      <button
        type="button"
        className="nav-menu-toggle"
        onClick={() => setMenuOpen((open) => !open)}
        aria-expanded={menuOpen}
        aria-label="Deschide meniul"
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`nav-links ${menuOpen ? "open" : ""}`}>
        <Link className={active === "crm" ? "active" : ""} href="/" onClick={() => setMenuOpen(false)}>CRM</Link>
        <Link className={active === "stats" ? "active" : ""} href="/stats" onClick={() => setMenuOpen(false)}>Statistici</Link>
        {manager?.role === "admin" && <Link className={active === "checklist" ? "active" : ""} href="/checklist" onClick={() => setMenuOpen(false)}>Checklist</Link>}
        {manager?.role === "admin" && <Link className={active === "admin" ? "active" : ""} href="/admin" onClick={() => setMenuOpen(false)}>Setari</Link>}
        {manager && <button type="button" onClick={handleLogout}>Logout</button>}
      </div>

      <div className="nav-right">
        {manager && (
          <span className={`nav-user nav-user-status ${systemStatus === "error" ? "error" : "ok"}`}>
            <span className="status-dot" aria-hidden="true" />
            <span>{userLabel}</span>
            <span className="nav-health-text">{statusLabel}</span>
          </span>
        )}
        <span className="nav-brand" aria-label="NextTouch CRM">
          <img src="/nexttouch-logo.png" alt="NextTouch CRM" />
        </span>
      </div>
    </nav>
  );
}

export function StatsPanel({ stats, showManagerStats = true }) {
  return (
    <section className="stats-panel stats-page-panel" aria-label="Statistici CRM">
      <div className="archive-head">
        <div>
          <p className="eyebrow">Statistica</p>
          <h2>Performanta manageri si etape</h2>
        </div>
        <Link className="mini-btn primary" href="/archive">Clienti inactivi</Link>
      </div>
      <div className="stats-cards">
        {stats.cards.map((card) => <article key={card.label} className="stat-card"><span>{card.label}</span><strong>{card.value}</strong></article>)}
      </div>
      <div className="stats-layout">
        {showManagerStats && <StatsTable title="Manageri" columns={["Manager", "Lead-uri", "Prelucrari", "Necitite", "Arhivate"]} rows={stats.managers} />}
        <StatsTable title="Etape / Tags" columns={["Etapa", "Lead-uri", "Prelucrari"]} rows={stats.stages} />
        <StatsTable title="Interes actual" columns={["Interes", "Lead-uri active", "Schimbari in istoric"]} rows={stats.currentInterests || []} />
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
