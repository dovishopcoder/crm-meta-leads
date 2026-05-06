"use client";

import { useEffect, useMemo, useState } from "react";
import { AppNav, StatsPanel } from "../components";
import { buildStats, loadStoredLeads, managers, products, stages } from "../crm-data";
import { getCurrentSession, loadCrmConfig, loadCurrentManager, loadSupabaseLeads } from "../supabase-crm";

export default function StatsPage() {
  const [leads, setLeads] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [dataSource, setDataSource] = useState("loading");
  const [currentManager, setCurrentManager] = useState(null);
  const [crmConfig, setCrmConfig] = useState({ managers, stages, products });

  useEffect(() => {
    async function loadLeads() {
      try {
        const session = await getCurrentSession();
        if (!session) {
          window.location.href = "/login";
          return;
        }

        setCurrentManager(await loadCurrentManager());
        setCrmConfig(await loadCrmConfig());
        setLeads(await loadSupabaseLeads());
        setDataSource("supabase");
      } catch {
        setLeads(loadStoredLeads());
        setCrmConfig({ managers, stages, products });
        setDataSource("local");
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
      <AppNav active="stats" manager={currentManager} />
      <div className={`connection-banner ${dataSource === "supabase" ? "online" : "offline"}`}>
        <span>{dataSource === "supabase" ? "Conectat la Supabase" : "Mod local"}</span>
        <span>Statistici actualizate</span>
      </div>
      <StatsPanel stats={stats} />
    </main>
  );
}
