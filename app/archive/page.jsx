"use client";

import { useEffect, useState } from "react";
import { AppNav } from "../components";
import { managers, products, stages, leadStatuses, religions, hooks } from "../crm-data";
import { getCurrentSession, loadCrmConfig, loadCurrentManager, loadSupabaseLeads, saveSupabaseLead, signOut, supabase } from "../supabase-crm";

const FALLBACK_MANAGER_ID = "diana";

export default function ArchivePage() {
  const [leads, setLeads] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [currentManager, setCurrentManager] = useState(null);
  const [crmConfig, setCrmConfig] = useState({ managers, stages, products, statuses: leadStatuses, religions, hooks });
  const [dataSource, setDataSource] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState("idle");

  useEffect(() => {
    async function loadArchive() {
      try {
        const session = await getCurrentSession();
        if (!session) {
          window.location.href = "/login";
          return;
        }

        const manager = await loadCurrentManager();
        if (!manager?.active) {
          await signOut();
          window.location.href = "/login";
          return;
        }

        setCurrentManager(manager);
        setCrmConfig(await loadCrmConfig());
        setLeads(await loadSupabaseLeads());
        setDataSource("supabase");
        setLoadError("");
      } catch (error) {
        if (!supabase) {
          setCrmConfig({ managers, stages, products, statuses: leadStatuses, religions, hooks });
          setDataSource("local");
          setLoadError("");
          return;
        }
        setLeads([]);
        setDataSource("error");
        setLoadError(error.message || "Supabase nu raspunde.");
      } finally {
        setLoaded(true);
      }
    }

    loadArchive();
  }, []);

  const archivedLeads = leads.filter((lead) => lead.archived);

  function managerForConfig(id) {
    return crmConfig.managers.find((manager) => manager.code === id) || managers.find((manager) => manager.id === id) || managers[0];
  }

  function statusForConfig(id) {
    return (crmConfig.statuses || leadStatuses).find((status) => status.id === id) || { id, name: id || "Nou" };
  }

  function religionLabelForConfig(tag) {
    const activeReligions = (crmConfig.religions || religions).filter((religion) => religion.active);
    return activeReligions.find((religion) => religion.id === tag || religion.name.toLowerCase() === String(tag).toLowerCase())?.name || tag;
  }

  async function restoreLead(id) {
    const lead = leads.find((item) => item.id === id);
    if (!lead) return;

    const updatedLead = {
      ...lead,
      archived: false,
      archivedAt: "",
      status: "reactivated",
      unread: true,
      stage: "reactivated",
      activity: [...(lead.activity || []), { type: "restored", at: new Date().toISOString(), managerId: lead.managerId || FALLBACK_MANAGER_ID }]
    };

    setSaveState("saving");
    try {
      const savedLead = await saveSupabaseLead(updatedLead);
      setLeads((current) => current.map((item) => (item.id === id ? savedLead : item)));
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1400);
    } catch (error) {
      setLoadError(error.message || "Nu s-a putut reactiva clientul.");
      setSaveState("error");
      window.setTimeout(() => setSaveState("idle"), 2400);
    }
  }

  if (!loaded) return null;

  return (
    <main className="stats-page-shell">
      <AppNav active="stats" manager={currentManager} />
      <div className={`connection-banner ${dataSource === "supabase" ? "online" : "offline"}`}>
        <span>{dataSource === "supabase" ? "Conectat la Supabase" : dataSource === "error" ? "Eroare Supabase" : "Mod local"}</span>
        <span>{loadError || (saveState === "saving" ? "Se salveaza..." : saveState === "saved" ? "Salvat" : "Clienti inactivi")}</span>
      </div>

      <ArchivePanel
        leads={archivedLeads}
        lookups={{ managerForConfig, statusForConfig, religionLabelForConfig }}
        onRestore={restoreLead}
      />
    </main>
  );
}

function ArchivePanel({ leads, lookups, onRestore }) {
  const { managerForConfig, statusForConfig, religionLabelForConfig } = lookups;
  return (
    <section className="archive-panel" aria-label="Clienti arhivati">
      <div className="archive-head">
        <div>
          <p className="eyebrow">Arhiva</p>
          <h2>Clienti inactivi</h2>
        </div>
        <span className="count-badge archive-count">{leads.length}</span>
      </div>
      <div className="archive-table-wrap">
        <table className="archive-table">
          <thead><tr><th>Client</th><th>Platforma</th><th>Manager</th><th>Religie</th><th>Status</th><th>Actiuni</th></tr></thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td><div className="archive-client"><Avatar lead={lead} /><span>{lead.name}</span></div></td>
                <td><span className={`platform-pill platform-${lead.platform}`}>{platformLabel(lead.platform)}</span></td>
                <td>{managerForConfig(lead.managerId).name}</td>
                <td>
                  {lead.tags?.length ? (
                    <div className="tag-row">{lead.tags.map((tag) => <span key={tag} className="tag-pill">{religionLabelForConfig(tag)}</span>)}</div>
                  ) : (
                    <span className="muted-cell">Neindicat</span>
                  )}
                </td>
                <td>{statusForConfig(lead.status).name}</td>
                <td><button className="mini-btn primary" onClick={() => onRestore(lead.id)}>Reactiveaza</button></td>
              </tr>
            ))}
            {!leads.length && <tr><td className="archive-empty" colSpan={6}>Nu exista clienti arhivati.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Avatar({ lead }) {
  if (!lead.avatar) {
    return <span className="avatar avatar-empty" aria-hidden="true" />;
  }

  return <img className="avatar" src={avatarSrc(lead.avatar)} alt="" />;
}

function avatarSrc(src) {
  if (!src) return "";
  try {
    const url = new URL(src);
    if (url.hostname.includes("fbsbx.com") || url.hostname.includes("fbcdn.net")) {
      return `/api/meta/avatar?src=${encodeURIComponent(src)}`;
    }
  } catch {
    return src;
  }
  return src;
}

function platformLabel(platform) {
  return platform === "facebook" ? "Facebook" : "Instagram";
}
