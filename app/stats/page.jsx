"use client";

import { useEffect, useMemo, useState } from "react";
import { AppNav, StatsPanel } from "../components";
import { buildStats, currentInterests, loadStoredLeads, managers, needCategories, products, stages } from "../crm-data";
import { getCurrentSession, loadCrmConfig, loadCurrentManager, loadSupabaseLeads, signOut, supabase } from "../supabase-crm";

export default function StatsPage() {
  const [leads, setLeads] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [dataSource, setDataSource] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [currentManager, setCurrentManager] = useState(null);
  const [crmConfig, setCrmConfig] = useState({ managers, stages, products, currentInterests, needCategories });

  useEffect(() => {
    async function loadLeads() {
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
          setLeads(loadStoredLeads());
          setCrmConfig({ managers, stages, products, currentInterests, needCategories });
          setDataSource("local");
          setLoadError("");
          return;
        }
        setLeads([]);
        setDataSource("error");
        setLoadError(error.message || "Baza de date nu raspunde.");
      } finally {
        setLoaded(true);
      }
    }

    loadLeads();
  }, []);

  const stats = useMemo(() => buildStats(leads, crmConfig), [leads, crmConfig]);

  if (!loaded) return null;

  return (
    <main className="stats-page-shell">
      <AppNav active="stats" manager={currentManager} systemStatus={dataSource === "error" ? "error" : "ok"} />
      {connectionMessage(dataSource, currentManager, loadError) && (
        <div className={`connection-banner ${dataSource === "error" ? "offline" : "online"}`}>
          <span>{connectionLabel(dataSource, currentManager)}</span>
          <span>{connectionMessage(dataSource, currentManager, loadError)}</span>
        </div>
      )}
      <StatsPanel stats={stats} showManagerStats={currentManager?.role === "admin"} />
    </main>
  );
}

function connectionLabel(dataSource, manager) {
  if (dataSource === "error") return "Eroare de conectare";
  if (dataSource !== "supabase") return "Mod local";
  return manager?.role === "admin" ? "Conectat la baza de date" : "Totul functioneaza";
}

function connectionMessage(dataSource, manager, loadError) {
  if (dataSource === "error") return loadError || "Verifica conexiunea.";
  if (manager?.role === "admin") return "Statistici actualizate";
  return "";
}
