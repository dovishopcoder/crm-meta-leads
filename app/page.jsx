"use client";

import { useEffect, useMemo, useState } from "react";
import { AppNav } from "./components";
import { getCurrentSession, loadCrmConfig, loadCurrentManager, loadSupabaseLeads, saveSupabaseLead, signOut, supabase } from "./supabase-crm";

const DAY_MS = 24 * 60 * 60 * 1000;
const FALLBACK_MANAGER_ID = "diana";
const PENDING_INBOX_LEAD_KEY = "crm-pending-inbox-lead";

const managers = [
  { id: "unassigned", name: "Neatribuit", color: "#8a97aa" },
  { id: "diana", name: "Diana", color: "#1e8f72" },
  { id: "alex", name: "Alex", color: "#2772d8" },
  { id: "marina", name: "Marina", color: "#cc3d5a" }
];

const stages = [
  { id: "new", name: "Nou" },
  { id: "interested", name: "Interesat" },
  { id: "proposal", name: "Propunere facuta" },
  { id: "followup", name: "Follow-up" },
  { id: "accepted", name: "Acceptat" },
  { id: "no-response", name: "Nu raspunde" },
  { id: "reactivated", name: "Reactivat" },
  { id: "closed", name: "Inchis" }
];

const products = [
  { id: "biblical-courses", name: "Cursuri biblice" },
  { id: "health-prayer", name: "Rugaciune sanatate" },
  { id: "meeting", name: "Intalnire" },
  { id: "consultation", name: "Consultatie" }
];

const leadStatuses = [
  { id: "new", name: "Nou" },
  { id: "scheduled", name: "Programat" },
  { id: "reactivated", name: "Reactivat" },
  { id: "contacted", name: "Contactat" },
  { id: "closed", name: "Inchis" }
];

const religions = [
  { id: "adventist", name: "Adventist" },
  { id: "ortodox", name: "Ortodox" },
  { id: "catolic", name: "Catolic" },
  { id: "alta", name: "Alta" }
];

const hooks = [
  { id: "sanatate", name: "Sanatate" },
  { id: "familie", name: "Familie" },
  { id: "intrebari-teologice", name: "Intrebari teologice" },
  { id: "critice", name: "Critice" }
];

function makeDefaultLeads() {
  return [
    {
      id: "lead-1",
      name: "Ana Munteanu",
      platform: "instagram",
      avatar: "https://i.pravatar.cc/120?img=47",
      metaUrl: "https://business.facebook.com/latest/inbox/all?asset_id=demo-ana",
      status: "new",
      unread: true,
      archived: false,
      stage: "new",
      createdAt: addDaysIso(new Date(), -2),
      firstMessageAt: addDaysIso(new Date(), -2),
      processedCount: 0,
      lastProcessedAt: "",
      tagHistory: [],
      products: [],
      activity: [],
      managerId: "diana",
      priority: "normal",
      tags: ["cald", "canapea"],
      phone: "+373 69 111 222",
      notes: "A intrebat despre livrare si culori disponibile.",
      followDate: ""
    },
    {
      id: "lead-2",
      name: "Victor Rusu",
      platform: "facebook",
      avatar: "https://i.pravatar.cc/120?img=12",
      metaUrl: "https://business.facebook.com/latest/inbox/all?asset_id=demo-victor",
      status: "new",
      unread: true,
      archived: false,
      stage: "interested",
      createdAt: addDaysIso(new Date(), -1),
      firstMessageAt: addDaysIso(new Date(), -1),
      processedCount: 1,
      lastProcessedAt: addDaysIso(new Date(), -1),
      tagHistory: [],
      products: [{ id: "meeting", status: "proposed", proposedAt: addDaysIso(new Date(), -1), managerId: "alex" }],
      activity: [],
      managerId: "alex",
      priority: "high",
      tags: ["pret", "masa"],
      phone: "",
      notes: "Vrea oferta pentru masa extensibila.",
      followDate: ""
    },
    {
      id: "lead-3",
      name: "Irina Ceban",
      platform: "instagram",
      avatar: "https://i.pravatar.cc/120?img=32",
      metaUrl: "https://business.facebook.com/latest/inbox/all?asset_id=demo-irina",
      status: "scheduled",
      unread: false,
      archived: false,
      stage: "proposal",
      createdAt: addDaysIso(new Date(), -6),
      firstMessageAt: addDaysIso(new Date(), -6),
      processedCount: 2,
      lastProcessedAt: addDaysIso(new Date(), -2),
      tagHistory: [],
      products: [{ id: "biblical-courses", status: "proposed", proposedAt: addDaysIso(new Date(), -2), managerId: "marina" }],
      activity: [],
      managerId: "marina",
      priority: "normal",
      tags: ["dulap", "masurari"],
      phone: "+373 78 444 010",
      notes: "De revenit cu data pentru masurari.",
      followDate: addDaysKey(new Date(), 2)
    },
    {
      id: "lead-4",
      name: "Mihai Lupu",
      platform: "facebook",
      avatar: "https://i.pravatar.cc/120?img=68",
      metaUrl: "https://business.facebook.com/latest/inbox/all?asset_id=demo-mihai",
      status: "new",
      unread: true,
      archived: false,
      stage: "followup",
      createdAt: toIso(new Date()),
      firstMessageAt: toIso(new Date()),
      processedCount: 0,
      lastProcessedAt: "",
      tagHistory: [],
      products: [{ id: "health-prayer", status: "proposed", proposedAt: toIso(new Date()), managerId: "unassigned" }],
      activity: [],
      managerId: "unassigned",
      priority: "high",
      tags: ["urgent"],
      phone: "",
      notes: "Cere termen rapid pentru comanda.",
      followDate: ""
    },
    {
      id: "lead-5",
      name: "Elena Balan",
      platform: "instagram",
      avatar: "https://i.pravatar.cc/120?img=5",
      metaUrl: "https://business.facebook.com/latest/inbox/all?asset_id=demo-elena",
      status: "contacted",
      unread: false,
      archived: false,
      stage: "accepted",
      createdAt: addDaysIso(new Date(), -9),
      firstMessageAt: addDaysIso(new Date(), -9),
      processedCount: 4,
      lastProcessedAt: addDaysIso(new Date(), -1),
      tagHistory: [],
      products: [
        { id: "biblical-courses", status: "accepted", proposedAt: addDaysIso(new Date(), -4), managerId: "diana" },
        { id: "consultation", status: "proposed", proposedAt: addDaysIso(new Date(), -1), managerId: "diana" }
      ],
      activity: [],
      managerId: "diana",
      priority: "low",
      tags: ["follow-up", "pat"],
      phone: "+373 60 700 900",
      notes: "A primit catalogul, asteapta pretul final.",
      followDate: addDaysKey(new Date(), 4)
    }
  ];
}

export default function HomePage() {
  const [leads, setLeads] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [currentManager, setCurrentManager] = useState(null);
  const [crmConfig, setCrmConfig] = useState({ managers, stages, products, statuses: leadStatuses, religions, hooks });
  const [dataSource, setDataSource] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [modalSource, setModalSource] = useState("direct");
  const [draft, setDraft] = useState(null);
  const [warning, setWarning] = useState("");
  const [manualLeadOpen, setManualLeadOpen] = useState(false);
  const [manualLead, setManualLead] = useState(makeEmptyManualLead());
  const [manualError, setManualError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [onlyMyLeads, setOnlyMyLeads] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("week");
  const [cursorDate, setCursorDate] = useState(startOfDay(new Date()));
  const [mobileView, setMobileView] = useState("inbox");

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
        const remoteLeads = await loadSupabaseLeads();
        setLeads(remoteLeads);
        setDataSource("supabase");
        setLoadError("");
      } catch (error) {
        console.warn("Supabase load error:", error.message);
        if (!supabase) {
          const stored = window.localStorage.getItem("crm-next-leads") || window.localStorage.getItem("crm-leads");
          const initial = stored ? JSON.parse(stored).map(normalizeLead) : makeDefaultLeads();
          setLeads(initial);
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

    loadLeads();
  }, []);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem("crm-next-leads", JSON.stringify(leads));
    }
  }, [leads, loaded]);

  const filteredLeads = useMemo(() => {
    const currentManagerCode = currentManager?.code || FALLBACK_MANAGER_ID;
    return leads.filter((lead) => {
      if (lead.archived || !lead.unread) return false;
      if (activeFilter !== "all" && lead.platform !== activeFilter) return false;
      if (onlyMyLeads && lead.managerId !== currentManagerCode && lead.managerId !== "unassigned") return false;
      if (managerFilter !== "all" && lead.managerId !== managerFilter) return false;
      const haystack = [lead.name, lead.platform, lead.status, lead.phone, lead.notes, managerForConfig(lead.managerId).name, ...(lead.tags || [])]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [activeFilter, currentManager, crmConfig, leads, managerFilter, onlyMyLeads, search]);

  const visibleDates = useMemo(() => getVisibleDates(cursorDate, view), [cursorDate, view]);
  const selectedLead = leads.find((lead) => lead.id === selectedId);
  const activeManagers = crmConfig.managers.filter((manager) => manager.active);
  const activeStages = crmConfig.stages.filter((stage) => stage.active);
  const activeProducts = crmConfig.products.filter((product) => product.active);
  const activeStatuses = (crmConfig.statuses || leadStatuses).filter((status) => status.active);
  const activeReligions = (crmConfig.religions || religions).filter((religion) => religion.active);
  const activeHooks = (crmConfig.hooks || hooks).filter((hook) => hook.active);

  useEffect(() => {
    if (!loaded || selectedId) return;
    const pendingId = window.localStorage.getItem(PENDING_INBOX_LEAD_KEY);
    if (!pendingId) return;

    const pendingLead = leads.find((lead) => lead.id === pendingId);
    if (pendingLead?.unread && !pendingLead.archived) {
      setSelectedId(pendingLead.id);
      setModalSource("inbox");
      setDraft(makeLeadDraft(pendingLead));
      setWarning("Acest lead a ramas deschis in Necitite. Finalizeaza pasii obligatorii inainte de a continua.");
      setMobileView("inbox");
    } else {
      window.localStorage.removeItem(PENDING_INBOX_LEAD_KEY);
    }
  }, [leads, loaded, selectedId]);

  useEffect(() => {
    if (!selectedLead || modalSource !== "inbox" || !selectedLead.unread) return;

    const warnBeforeRefresh = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeRefresh);
    return () => window.removeEventListener("beforeunload", warnBeforeRefresh);
  }, [modalSource, selectedLead]);

  function managerForConfig(id) {
    return crmConfig.managers.find((manager) => manager.code === id) || managerFor(id);
  }

  function stageForConfig(id) {
    return crmConfig.stages.find((stage) => stage.id === id) || stageFor(id);
  }

  function productForConfig(id) {
    return crmConfig.products.find((product) => product.id === id) || productFor(id);
  }

  function statusForConfig(id) {
    return (crmConfig.statuses || leadStatuses).find((status) => status.id === id) || { id, name: id || "Nou" };
  }

  function religionLabelForConfig(tag) {
    return activeReligions.find((religion) => religion.id === tag || religion.name.toLowerCase() === String(tag).toLowerCase())?.name || tag;
  }

  function updateLead(id, updater) {
    setLeads((current) => {
      let updatedLead = null;
      const next = current.map((lead) => {
        if (lead.id !== id) return lead;
        updatedLead = updater({ ...lead });
        return updatedLead;
      });

      if (updatedLead) {
        setSaveState("saving");
        saveSupabaseLead(updatedLead)
          .then((savedLead) => {
            setSaveError("");
            setSaveState("saved");
            setDataSource("supabase");
            if (savedLead.id !== updatedLead.id) {
              setLeads((latest) => latest.map((lead) => (lead.id === updatedLead.id ? savedLead : lead)));
            }
            window.setTimeout(() => setSaveState("idle"), 1400);
          })
          .catch((error) => {
            console.warn("Supabase save fallback:", error.message);
            setSaveError(error.message);
            setSaveState("error");
            window.setTimeout(() => setSaveState("idle"), 2400);
          });
      }

      return next;
    });
  }

  function createManualLead(event) {
    event.preventDefault();
    const name = manualLead.name.trim();
    const metaUrl = manualLead.metaUrl.trim();

    if (!name) {
      setManualError("Scrie numele clientului.");
      return;
    }

    if (!metaUrl) {
      setManualError("Adauga linkul direct din Meta Business Suite.");
      return;
    }

    const now = toIso(new Date());
    const existingLead = leads.find((lead) => normalizeMetaUrl(lead.metaUrl) === normalizeMetaUrl(metaUrl));

    if (existingLead) {
      const location = existingLead.unread ? "in Necitite" : existingLead.followDate ? "in calendar" : "in CRM";
      setManualError(`Acest lead exista deja ${location}: ${existingLead.name}. Nu poti crea acelasi lead de doua ori.`);
      return;
    }

    const lead = {
      id: `manual-${Date.now()}`,
      metaContactId: `manual-${Date.now()}`,
      name,
      platform: manualLead.platform,
      avatar: "",
      metaUrl,
      metaUrlVerified: true,
      email: "",
      customerEmail: "",
      hook: manualLead.hook,
      status: "new",
      unread: true,
      archived: false,
      stage: "new",
      createdAt: now,
      firstMessageAt: now,
      lastMessageAt: now,
      processedCount: 0,
      lastProcessedAt: "",
      tagHistory: [],
      products: [],
      activity: [{ type: "manual_created", at: now, managerId: manualLead.managerId }],
      managerId: manualLead.managerId,
      priority: manualLead.priority,
      tags: [],
      phone: manualLead.phone.trim(),
      notes: manualLead.notes.trim(),
      followDate: ""
    };

    setSaveState("saving");
    saveSupabaseLead(lead, { rejectDuplicateMetaUrl: true })
      .then((savedLead) => {
        setLeads((current) => [savedLead, ...current]);
        setSaveError("");
        setSaveState("saved");
        setDataSource("supabase");
        setManualLead(makeEmptyManualLead());
        setManualLeadOpen(false);
        setManualError("");
        setMobileView("inbox");
        window.setTimeout(() => setSaveState("idle"), 1400);
      })
      .catch((error) => {
        setSaveError(error.message);
        setSaveState("error");
        setManualError(error.message || "Nu s-a putut crea lead-ul.");
        window.setTimeout(() => setSaveState("idle"), 2400);
      });
  }

  function openLead(lead, source) {
    setSelectedId(lead.id);
    setModalSource(source);
    setWarning("");
    setDraft(makeLeadDraft(lead));
    if (source === "inbox" && lead.unread) {
      window.localStorage.setItem(PENDING_INBOX_LEAD_KEY, lead.id);
    }
  }

  function closeModal() {
    if (!selectedLead || !draft) return;
    if (modalSource === "inbox" && selectedLead.unread && !selectedLead.metaUrlVerified) {
      setWarning("Salveaza linkul direct din Meta inainte de a inchide acest lead.");
      return;
    }
    if (!canCloseSelected()) return;
    if (modalSource === "inbox" && selectedLead.unread) {
      saveSelectedLead();
      return;
    }
    window.localStorage.removeItem(PENDING_INBOX_LEAD_KEY);
    setSelectedId(null);
    setDraft(null);
  }

  function canCloseSelected() {
    if (!selectedLead || !draft) return true;
    if (modalSource !== "inbox" || !selectedLead.unread) return true;
    if (!selectedLead.metaUrlVerified && !draft.metaUrlVerified) return true;
    if (isTodayOrFutureDateKey(draft.followDate)) return true;
    setWarning("Alege o data de follow-up pentru azi sau viitor, apoi apasa Salveaza. Un mesaj deschis din necitite nu poate fi inchis fara urmatorul pas.");
    return false;
  }

  function saveSelectedLead(options = {}) {
    if (!selectedLead || !draft) return;
    if (!options.metaLinkOnly && !canCloseSelected()) return;

    const now = toIso(new Date());
    updateLead(selectedLead.id, (lead) => {
      const previousStage = lead.stage || "new";
      const previousProducts = new Set((lead.products || []).map((item) => item.id));
      const selectedProducts = draft.products.map((productId) => {
        const existing = (lead.products || []).find((item) => item.id === productId);
        return existing || { id: productId, status: "proposed", proposedAt: now, managerId: draft.managerId };
      });

      lead.metaUrl = draft.metaUrl.trim() || lead.metaUrl;
      lead.metaUrlVerified = Boolean(draft.metaUrlVerified || draft.metaUrl.trim());

      if (options.metaLinkOnly) {
        return lead;
      }

      lead.status = draft.followDate ? "scheduled" : draft.status;
      lead.unread = false;
      lead.managerId = draft.managerId;
      lead.priority = draft.priority;
      lead.followDate = draft.followDate;
      lead.stage = draft.stage;
      lead.tags = draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
      lead.hook = draft.hook;
      lead.products = selectedProducts;
      lead.customerEmail = draft.customerEmail.trim();
      lead.phone = draft.phone.trim();
      lead.notes = draft.notes.trim();
      lead.processedCount = (lead.processedCount || 0) + 1;
      lead.lastProcessedAt = now;

      if (previousStage !== lead.stage) {
        lead.tagHistory = [...(lead.tagHistory || []), { from: previousStage, to: lead.stage, changedAt: now, managerId: draft.managerId }];
      }

      lead.activity = [
        ...(lead.activity || []),
        {
          type: "processed",
          at: now,
          managerId: draft.managerId,
          stage: lead.stage,
          followDate: lead.followDate,
          products: selectedProducts.filter((item) => !previousProducts.has(item.id)).map((item) => item.id)
        }
      ];
      return lead;
    });

    if (!options.keepOpen) {
      window.localStorage.removeItem(PENDING_INBOX_LEAD_KEY);
      setSelectedId(null);
      setDraft(null);
    }
  }

  function scheduleLead(id, dateKey) {
    if (!isTodayOrFutureDateKey(dateKey)) return;
    updateLead(id, (lead) => ({
      ...lead,
      followDate: dateKey,
      status: "scheduled",
      unread: false,
      managerId: lead.managerId || "unassigned"
    }));
  }

  function archiveSelectedLead() {
    if (!selectedLead) return;
    updateLead(selectedLead.id, (lead) => ({
      ...lead,
      archived: true,
      status: "closed",
      unread: false,
      stage: "closed",
      followDate: "",
      activity: [...(lead.activity || []), { type: "archived", at: toIso(new Date()), managerId: lead.managerId }]
    }));
    window.localStorage.removeItem(PENDING_INBOX_LEAD_KEY);
    setSelectedId(null);
    setDraft(null);
  }

  function restoreLead(id) {
    updateLead(id, (lead) => ({
      ...lead,
      archived: false,
      status: "reactivated",
      unread: true,
      stage: "reactivated",
      activity: [...(lead.activity || []), { type: "restored", at: toIso(new Date()), managerId: lead.managerId }]
    }));
  }

  if (!loaded) return null;

  return (
    <main className="app-shell">
      <div className="crm-top-menu">
        <AppNav active="crm" manager={currentManager} />
      </div>

      <div className="mobile-crm-tabs" role="tablist" aria-label="Interfete CRM">
        <button type="button" className={mobileView === "inbox" ? "active" : ""} onClick={() => setMobileView("inbox")}>
          Necitite
        </button>
        <button type="button" className={mobileView === "calendar" ? "active" : ""} onClick={() => setMobileView("calendar")}>
          Calendar
        </button>
      </div>

      <aside className={`inbox-panel ${mobileView !== "inbox" ? "mobile-hidden" : ""}`}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">Meta Inbox</p>
            <h1>Lead-uri noi</h1>
          </div>
          <div className="panel-head-actions">
            <button type="button" className="mini-btn primary" onClick={() => setManualLeadOpen(true)}>Lead manual</button>
            <span className="count-badge">{filteredLeads.length}</span>
          </div>
        </div>

        <div className="search-wrap">
          <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Cauta dupa nume, tag sau platforma" />
        </div>

        <div className="quick-filters" aria-label="Filtre lead-uri">
          {["all", "facebook", "instagram"].map((filter) => (
            <button key={filter} className={`chip ${activeFilter === filter ? "active" : ""}`} onClick={() => setActiveFilter(filter)}>
              {filter === "all" ? "Toate" : platformLabel(filter)}
            </button>
          ))}
        </div>

        {currentManager?.role === "admin" && (
          <label className="compact-label">
            Manager
            <select value={managerFilter} onChange={(event) => setManagerFilter(event.target.value)}>
              <option value="all">Toti managerii</option>
              {activeManagers.map((manager) => (
                <option key={manager.code} value={manager.code}>{manager.name}</option>
              ))}
            </select>
          </label>
        )}

        <label className="toggle-row">
          <input type="checkbox" checked={onlyMyLeads} onChange={(event) => setOnlyMyLeads(event.target.checked)} />
          <span>{currentManager?.role === "admin" ? "Filtreaza pe mine" : "Doar lead-urile mele"}</span>
        </label>

        <section className="lead-list" aria-label="Lista chat-uri necitite">
          {filteredLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} lookups={{ managerForConfig, stageForConfig, productForConfig, statusForConfig }} onOpen={() => openLead(lead, "inbox")} onDragStart={(event) => event.dataTransfer.setData("text/plain", lead.id)} />
          ))}
          {!filteredLeads.length && <p className="empty-day">Nu exista lead-uri pentru filtrul ales.</p>}
        </section>
      </aside>

      <section className={`calendar-panel ${mobileView !== "calendar" ? "mobile-hidden" : ""}`}>
        <div className={`connection-banner ${dataSource === "supabase" ? "online" : "offline"}`}>
          <span>{dataSource === "supabase" ? "Conectat la Supabase" : dataSource === "error" ? "Eroare Supabase" : "Mod local"}</span>
          <span>{loadError || (saveState === "saving" ? "Se salveaza..." : saveState === "saved" ? "Salvat" : saveState === "error" ? `Eroare: ${saveError || "salvare esuata"}` : "Gata")}</span>
        </div>

        <header className="calendar-toolbar">
          <div className="calendar-title">
            <p className="eyebrow">Follow-up</p>
            <h2>{calendarTitle(visibleDates, view)}</h2>
          </div>

          <div className="toolbar-actions">
            <button className="icon-btn" onClick={() => setCursorDate(addDays(cursorDate, view === "day" ? -1 : view === "week" ? -7 : -30))} aria-label="Perioada precedenta">&lt;</button>
            <button className="today-btn" onClick={() => setCursorDate(startOfDay(new Date()))}>Azi</button>
            <button className="icon-btn" onClick={() => setCursorDate(addDays(cursorDate, view === "day" ? 1 : view === "week" ? 7 : 30))} aria-label="Perioada urmatoare">&gt;</button>
            <div className="segmented" role="tablist" aria-label="Unitate calendar">
              {["day", "week", "month"].map((item) => (
                <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>
                  {item === "day" ? "Zi" : item === "week" ? "Saptamana" : "Luna"}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="calendar-meta">
          <span>Prima coloana este mereu data selectata.</span>
          <span>Trage un lead peste o zi sau deschide detaliile pentru salvare.</span>
        </div>

        <section className="calendar-grid" style={{ "--columns": visibleDates.length }} aria-label="Calendar follow-up">
          {visibleDates.map((date) => {
            const key = toDateKey(date);
            const events = leads.filter((lead) => {
              if (lead.archived || lead.followDate !== key) return false;
              if (onlyMyLeads && lead.managerId !== (currentManager?.code || FALLBACK_MANAGER_ID)) return false;
              return managerFilter === "all" || lead.managerId === managerFilter;
            });
            return (
              <section
                key={key}
                className={`day-column ${isSameDay(date, new Date()) ? "today-ring" : ""}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => scheduleLead(event.dataTransfer.getData("text/plain"), key)}
              >
                <header className="day-head">
                  <div className="day-name">{weekday(date)}</div>
                  <div className="day-date">
                    <span className="day-number">{date.getDate()}</span>
                    <span>{monthName(date)}</span>
                  </div>
                </header>
                <div className="day-events">
                  {events.map((lead) => (
                    <EventCard key={lead.id} lead={lead} lookups={{ managerForConfig, stageForConfig, productForConfig, statusForConfig }} onOpen={() => openLead(lead, "calendar")} onDragStart={(event) => event.dataTransfer.setData("text/plain", lead.id)} />
                  ))}
                  {!events.length && <p className="empty-day">Liber pentru follow-up</p>}
                </div>
              </section>
            );
          })}
        </section>
      </section>

      {selectedLead && draft && (
        <ClientModal
          lead={selectedLead}
          draft={draft}
          requiresFollowUp={modalSource === "inbox" && selectedLead.unread}
          requiresMetaLink={modalSource === "inbox" && selectedLead.unread && !selectedLead.metaUrlVerified}
          warning={warning}
          config={{ managers: activeManagers, stages: activeStages, products: activeProducts, statuses: activeStatuses, religions: activeReligions, hooks: activeHooks }}
          isAdmin={currentManager?.role === "admin"}
          lookups={{ managerForConfig, stageForConfig, productForConfig, statusForConfig }}
          onChange={setDraft}
          onClose={closeModal}
          onArchive={archiveSelectedLead}
          onSave={saveSelectedLead}
        />
      )}

      {manualLeadOpen && (
        <ManualLeadModal
          draft={manualLead}
          error={manualError}
          managers={activeManagers}
          hooks={activeHooks}
          onChange={setManualLead}
          onClose={() => { setManualLeadOpen(false); setManualError(""); }}
          onSubmit={createManualLead}
        />
      )}
    </main>
  );
}

function LeadCard({ lead, lookups, onOpen, onDragStart }) {
  const { managerForConfig, stageForConfig, productForConfig } = lookups;
  return (
    <article className="lead-card" draggable onDragStart={onDragStart} onDoubleClick={onOpen}>
      <Avatar lead={lead} className="avatar" />
      <div className="lead-main">
        <div className="lead-name-row">
          <span className="lead-name">{lead.name}</span>
          <span className={`platform-pill platform-${lead.platform}`}>{platformLabel(lead.platform)}</span>
        </div>
        <p className="lead-details">{lead.followDate ? `Urmatorul mesaj: ${formatShortDate(parseKey(lead.followDate))}` : "Neprogramat"}</p>
        <div className="manager-line">
          <span className="manager-dot" style={{ "--manager-color": managerForConfig(lead.managerId).color }} />
          <span>{managerForConfig(lead.managerId).name}</span>
          <span className="status-pill">Mesaj nou</span>
          {lead.priority === "high" && <span className="status-pill">Prioritar</span>}
        </div>
        <div className="tag-row">
          <span className="tag-pill">{stageForConfig(lead.stage).name}</span>
          {lead.products?.slice(0, 2).map((item) => <span key={item.id} className="tag-pill">{productForConfig(item.id).name}</span>)}
        </div>
        {Boolean(lead.tags?.length) && <div className="tag-row">{lead.tags.map((tag) => <span key={tag} className="tag-pill">{tag}</span>)}</div>}
        <div className="lead-actions">
          <button className="mini-btn primary" onClick={onOpen}>Detalii</button>
        </div>
      </div>
    </article>
  );
}

function EventCard({ lead, lookups, onOpen, onDragStart }) {
  const { managerForConfig, stageForConfig, productForConfig, statusForConfig } = lookups;
  return (
    <article className={`event-card ${lead.platform} ${lead.priority === "high" ? "priority-high" : ""}`} draggable onDragStart={onDragStart}>
      <strong>{lead.name}</strong>
      <span>{platformLabel(lead.platform)} - {statusForConfig(lead.status).name}</span>
      {lead.unread && <div className="event-badges"><span className="status-pill unread-pill">Mesaj nou</span></div>}
      <div className="manager-line">
        <span className="manager-dot" style={{ "--manager-color": managerForConfig(lead.managerId).color }} />
        <span>{managerForConfig(lead.managerId).name}</span>
      </div>
      <div className="tag-row">
        <span className="tag-pill">{stageForConfig(lead.stage).name}</span>
          {lead.products?.slice(0, 2).map((item) => <span key={item.id} className="tag-pill">{productForConfig(item.id).name}</span>)}
      </div>
      <div className="event-actions">
        <button className="mini-btn primary" onClick={onOpen}>Detalii</button>
      </div>
    </article>
  );
}

function Avatar({ lead, className = "" }) {
  const [failed, setFailed] = useState(false);

  if (!lead.avatar || failed) {
    return <span className={`avatar avatar-empty ${className}`.trim()} aria-hidden="true" />;
  }

  return <img className={className || "avatar"} src={avatarSrc(lead.avatar)} alt="" onError={() => setFailed(true)} />;
}

function ManualLeadModal({ draft, error, managers, hooks, onChange, onClose, onSubmit }) {
  function update(field, value) {
    onChange({ ...draft, [field]: value });
  }

  return (
    <div className="dialog-backdrop">
      <section className="client-dialog manual-lead-dialog">
        <form className="client-modal" onSubmit={onSubmit}>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Inchide">x</button>
          <div>
            <p className="eyebrow">Incarcare manuala</p>
            <h3>Lead nou din Meta Business Suite</h3>
          </div>

          <div className="field-grid">
            <label>Nume client<input value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="Numele din Meta" autoFocus /></label>
            <label>Platforma<select value={draft.platform} onChange={(event) => update("platform", event.target.value)}><option value="facebook">Facebook</option><option value="instagram">Instagram</option></select></label>
          </div>

          <label>Link Meta direct<input value={draft.metaUrl} onChange={(event) => update("metaUrl", event.target.value)} placeholder="https://business.facebook.com/latest/inbox/all?..." /></label>

          <div className="field-grid">
            <label>Manager responsabil<select value={draft.managerId} onChange={(event) => update("managerId", event.target.value)}><option value="unassigned">Neatribuit</option>{managers.map((manager) => <option key={manager.code} value={manager.code}>{manager.name}</option>)}</select></label>
            <label>Prioritate<select value={draft.priority} onChange={(event) => update("priority", event.target.value)}><option value="normal">Normala</option><option value="high">Inalta</option><option value="low">Joasa</option></select></label>
          </div>

          <div className="field-grid">
            <label>Telefon<input value={draft.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+373..." /></label>
            <label>Hook<select value={draft.hook} onChange={(event) => update("hook", event.target.value)}><option value="">Neindicat</option>{hooks.map((hook) => <option key={hook.id} value={hook.id}>{hook.name}</option>)}</select></label>
          </div>

          <label>Comentarii<textarea value={draft.notes} onChange={(event) => update("notes", event.target.value)} rows={4} placeholder="Note interne despre client" /></label>
          {error && <p className="modal-warning">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="ghost-btn" onClick={onClose}>Anuleaza</button>
            <button type="submit" className="primary-btn">Creeaza lead</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ClientModal({ lead, draft, requiresFollowUp, requiresMetaLink, warning, config, isAdmin, lookups, onChange, onClose, onArchive, onSave }) {
  function update(field, value) {
    onChange({ ...draft, [field]: value });
  }

  function saveMetaLinkOnly() {
    if (!draft.metaUrl.trim()) return;
    onSave({ metaLinkOnly: true, keepOpen: true });
  }

  return (
    <div className="dialog-backdrop">
      <section className="client-dialog">
        <form className="client-modal" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Inchide">x</button>
          <div className="modal-top">
            <Avatar lead={lead} />
            <div>
              <p className="eyebrow">{platformLabel(lead.platform)}</p>
              <h3>{lead.name}</h3>
              <a className="meta-open-btn" href={lead.metaUrl} target="_blank" rel="noreferrer">Deschide in Meta Business Suite</a>
            </div>
          </div>

          {requiresFollowUp && (
            <div className="modal-info">
              Mesaj deschis din necitite. Alege follow-up pentru azi sau viitor inainte de inchidere.
            </div>
          )}

          {requiresMetaLink ? (
            <div className="modal-section link-first-panel">
              <p className="eyebrow">Primul pas</p>
              <h3>Seteaza linkul direct din Meta</h3>
              <label>Link Meta direct<input value={draft.metaUrl} onChange={(event) => update("metaUrl", event.target.value)} placeholder="Lipeste linkul copiat din Meta Business Suite" /></label>
              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={onClose}>Inchide</button>
                <button type="button" className="primary-btn" onClick={saveMetaLinkOnly} disabled={!draft.metaUrl.trim()}>Salveaza linkul</button>
              </div>
              {warning && <p className="modal-warning">{warning}</p>}
            </div>
          ) : (
            <>

          <div className="field-grid">
            <label>Status<select value={draft.status} onChange={(event) => update("status", event.target.value)}>{config.statuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}</select></label>
            <label>Manager responsabil<select value={draft.managerId} onChange={(event) => update("managerId", event.target.value)}><option value="unassigned">Neatribuit</option>{config.managers.map((manager) => <option key={manager.code} value={manager.code}>{manager.name}</option>)}</select></label>
          </div>

          <div className="field-grid">
            <label>Urmatorul mesaj<input value={draft.followDate} onChange={(event) => update("followDate", event.target.value)} type="date" /></label>
            <label>Prioritate<select value={draft.priority} onChange={(event) => update("priority", event.target.value)}><option value="normal">Normala</option><option value="high">Inalta</option><option value="low">Joasa</option></select></label>
          </div>

          <label>Etapa / tag principal<select value={draft.stage} onChange={(event) => update("stage", event.target.value)}>{config.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></label>

          <div className="field-grid">
            <label>Religie<select value={draft.tags} onChange={(event) => update("tags", event.target.value)}><option value="">Neindicat</option>{config.religions.map((religion) => <option key={religion.id} value={religion.name}>{religion.name}</option>)}</select></label>
            <label>Hook<select value={draft.hook} onChange={(event) => update("hook", event.target.value)}><option value="">Neindicat</option>{config.hooks.map((hook) => <option key={hook.id} value={hook.id}>{hook.name}</option>)}</select></label>
          </div>

          <label>Produs propus<select value={draft.products[0] || ""} onChange={(event) => update("products", event.target.value ? [event.target.value] : [])}><option value="">Niciun produs</option>{config.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>

          <div className="client-meta-grid">
            <span>Creat: {formatDateTime(lead.createdAt)}</span>
            <span>Prelucrari: {lead.processedCount || 0}</span>
            <span>Ultima prelucrare: {lead.lastProcessedAt ? formatDateTime(lead.lastProcessedAt) : "-"}</span>
          </div>

          <ClientHistory lead={lead} lookups={lookups} />

          <div className="field-grid">
            <label>Email client<input value={draft.customerEmail} onChange={(event) => update("customerEmail", event.target.value)} placeholder="email oferit de client" /></label>
            <label>Telefon / contact extra<input value={draft.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+373..." /></label>
          </div>
          <label>Link Meta direct<input value={draft.metaUrl} onChange={(event) => update("metaUrl", event.target.value)} placeholder="https://business.facebook.com/latest/inbox/all?..." /></label>
          <label>Comentarii<textarea value={draft.notes} onChange={(event) => update("notes", event.target.value)} rows={5} placeholder="Note interne despre client" /></label>
          {warning && <p className="modal-warning">{warning}</p>}

          <div className="modal-actions">
            <button type="button" className="danger-btn" onClick={onArchive}>Arhiveaza</button>
            <button type="submit" className="primary-btn">Salveaza</button>
          </div>
            </>
          )}
        </form>
      </section>
    </div>
  );
}

function ClientHistory({ lead, lookups }) {
  const items = buildClientHistory(lead, lookups);

  return (
    <section className="modal-section">
      <p className="eyebrow">Istoric client</p>
      <div className="history-list">
        {items.map((item, index) => (
          <article key={`${item.at}-${index}`} className="history-item">
            <span>{formatDateTime(item.at)}</span>
            <strong>{item.title}</strong>
            {item.detail && <p>{item.detail}</p>}
          </article>
        ))}
        {!items.length && <p className="empty-history">Nu exista istoric pentru acest client.</p>}
      </div>
    </section>
  );
}

function buildClientHistory(lead, lookups) {
  const items = [];

  if (lead.createdAt) {
    items.push({
      at: lead.createdAt,
      title: "Client creat",
      detail: `Prima interactiune: ${lead.firstMessageAt ? formatDateTime(lead.firstMessageAt) : "-"}`
    });
  }

  (lead.tagHistory || []).forEach((entry) => {
    items.push({
      at: entry.changedAt,
      title: "Etapa schimbata",
      detail: `${lookups.stageForConfig(entry.from).name} -> ${lookups.stageForConfig(entry.to).name}`
    });
  });

  (lead.products || []).forEach((product) => {
    items.push({
      at: product.proposedAt || lead.createdAt,
      title: "Produs propus",
      detail: `${lookups.productForConfig(product.id).name} · ${product.status || "proposed"}`
    });
  });

  (lead.activity || []).forEach((activity) => {
    items.push({
      at: activity.at,
      title: activityTitle(activity.type),
      detail: activityDetail(activity, lookups)
    });
  });

  return items
    .filter((item) => item.at)
    .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())
    .slice(0, 10);
}

function activityTitle(type) {
  return {
    processed: "Client prelucrat",
    incoming_message: "Mesaj nou primit",
    reactivated_by_message: "Client reactivat prin mesaj nou",
    manual_created: "Lead creat manual",
    archived: "Client arhivat",
    restored: "Client reactivat"
  }[type] || "Activitate";
}

function activityDetail(activity, lookups) {
  if (activity.type === "processed") {
    const details = [];
    if (activity.stage) details.push(`Etapa: ${lookups.stageForConfig(activity.stage).name}`);
    if (activity.followDate) details.push(`Follow-up: ${formatShortDate(parseKey(activity.followDate))}`);
    if (activity.products?.length) details.push(`Produse noi: ${activity.products.map((id) => lookups.productForConfig(id).name).join(", ")}`);
    return details.join(" · ");
  }

  return "";
}

function StatsPanel({ stats }) {
  return (
    <section className="stats-panel" aria-label="Statistici CRM">
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

function ArchivePanel({ leads, lookups, onRestore }) {
  const { managerForConfig, statusForConfig, religionLabelForConfig } = lookups;
  return (
    <section className="archive-panel" aria-label="Clienti arhivati">
      <div className="archive-head">
        <div><p className="eyebrow">Arhiva</p><h2>Clienti inactivi</h2></div>
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

function buildStats(leads) {
  const total = leads.length;
  const unread = leads.filter((lead) => lead.unread && !lead.archived).length;
  const archived = leads.filter((lead) => lead.archived).length;
  const processed = leads.reduce((sum, lead) => sum + (lead.processedCount || 0), 0);
  const averageFollowup = averageFollowupDays(leads);

  return {
    cards: [
      { label: "Lead-uri total", value: total },
      { label: "Mesaje necitite", value: unread },
      { label: "Prelucrari total", value: processed },
      { label: "Arhivate", value: archived },
      { label: "Timp mediu follow-up", value: `${averageFollowup} zile` }
    ],
    managers: managers.map((manager) => {
      const managerLeads = leads.filter((lead) => lead.managerId === manager.id);
      return [manager.name, managerLeads.length, managerLeads.reduce((sum, lead) => sum + (lead.processedCount || 0), 0), managerLeads.filter((lead) => lead.unread && !lead.archived).length, managerLeads.filter((lead) => lead.archived).length];
    }),
    stages: stages.map((stage) => {
      const stageLeads = leads.filter((lead) => lead.stage === stage.id);
      return [stage.name, stageLeads.length, stageLeads.reduce((sum, lead) => sum + (lead.processedCount || 0), 0)];
    }),
    products: products.map((product) => {
      const proposed = leads.flatMap((lead) => lead.products || []).filter((item) => item.id === product.id);
      return [product.name, proposed.length, proposed.filter((item) => item.status === "accepted").length];
    })
  };
}

function normalizeLead(lead) {
  const now = toIso(new Date());
  return {
    ...lead,
    archived: lead.archived || false,
    unread: lead.unread ?? lead.status === "new",
    managerId: lead.managerId || "unassigned",
    priority: lead.priority || "normal",
    customerEmail: lead.customerEmail || "",
    stage: lead.stage || "new",
    createdAt: lead.createdAt || now,
    firstMessageAt: lead.firstMessageAt || lead.createdAt || now,
    processedCount: lead.processedCount || 0,
    lastProcessedAt: lead.lastProcessedAt || "",
    tagHistory: Array.isArray(lead.tagHistory) ? lead.tagHistory : [],
    products: Array.isArray(lead.products) ? lead.products.map((item) => (typeof item === "string" ? { id: item, status: "proposed", proposedAt: now, managerId: lead.managerId || "unassigned" } : item)) : [],
    activity: Array.isArray(lead.activity) ? lead.activity : []
  };
}

function makeEmptyManualLead() {
  return {
    name: "",
    platform: "facebook",
    metaUrl: "",
    managerId: "unassigned",
    priority: "normal",
    phone: "",
    hook: "",
    tags: "",
    notes: ""
  };
}

function makeLeadDraft(lead) {
  return {
    status: lead.status,
    managerId: lead.managerId || "unassigned",
    priority: lead.priority || "normal",
    followDate: lead.followDate || "",
    stage: lead.stage || "new",
    tags: (lead.tags || []).join(", "),
    hook: lead.hook || "",
    metaUrl: lead.metaUrlVerified ? lead.metaUrl || "" : "",
    metaUrlVerified: Boolean(lead.metaUrlVerified),
    customerEmail: lead.customerEmail || "",
    phone: lead.phone || "",
    notes: lead.notes || "",
    products: (lead.products || []).map((item) => item.id)
  };
}

function managerFor(id) {
  return managers.find((manager) => manager.id === id) || managers[0];
}

function stageFor(id) {
  return stages.find((stage) => stage.id === id) || stages[0];
}

function productFor(id) {
  return products.find((product) => product.id === id) || { id, name: id };
}

function getVisibleDates(cursorDate, view) {
  const count = view === "day" ? 1 : view === "month" ? 30 : 7;
  return Array.from({ length: count }, (_, index) => addDays(cursorDate, index));
}

function calendarTitle(dates, view) {
  if (view === "day") return formatLongDate(dates[0]);
  return `${formatShortDate(dates[0])} - ${formatShortDate(dates[dates.length - 1])}`;
}

function platformLabel(platform) {
  return platform === "facebook" ? "Facebook" : "Instagram";
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

function normalizeMetaUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    url.hash = "";
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    const sortedParams = new URLSearchParams();
    Array.from(url.searchParams.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .forEach(([key, paramValue]) => sortedParams.append(key, paramValue));
    url.search = sortedParams.toString();
    return url.toString().replace(/\/$/, "");
  } catch {
    return trimmed.replace(/\/$/, "");
  }
}

function statusLabel(status) {
  return { new: "Nou", scheduled: "Programat", reactivated: "Reactivat", contacted: "Contactat", closed: "Inchis" }[status] || "Nou";
}

function toDateKey(date) {
  const safe = startOfDay(date);
  return `${safe.getFullYear()}-${String(safe.getMonth() + 1).padStart(2, "0")}-${String(safe.getDate()).padStart(2, "0")}`;
}

function toIso(date) {
  return date.toISOString();
}

function addDaysIso(date, days) {
  return toIso(addDays(date, days));
}

function addDaysKey(date, days) {
  return toDateKey(addDays(date, days));
}

function parseKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function isSameDay(left, right) {
  return toDateKey(left) === toDateKey(right);
}

function isTodayOrFutureDateKey(dateKey) {
  if (!dateKey) return false;
  return parseKey(dateKey).getTime() >= startOfDay(new Date()).getTime();
}

function weekday(date) {
  return new Intl.DateTimeFormat("ro-RO", { weekday: "short" }).format(date);
}

function monthName(date) {
  return new Intl.DateTimeFormat("ro-RO", { month: "short" }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short" }).format(date);
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function averageFollowupDays(leads) {
  const values = leads
    .filter((lead) => lead.firstMessageAt && lead.followDate)
    .map((lead) => Math.max(0, Math.round((parseKey(lead.followDate).getTime() - new Date(lead.firstMessageAt).getTime()) / DAY_MS)));
  if (!values.length) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}
