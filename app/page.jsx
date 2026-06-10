"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppNav } from "./components";
import { createOrganization, getCurrentSession, loadCrmConfig, loadCurrentManager, loadSupabaseLeads, saveSupabaseLead, sendManyChatMessage, signOut, supabase } from "./supabase-crm";

const DAY_MS = 24 * 60 * 60 * 1000;
const FALLBACK_MANAGER_ID = "diana";
const PENDING_INBOX_LEAD_KEY = "crm-pending-inbox-lead";
const SELECTED_ORGANIZATION_KEY = "crm-selected-organization";
const FOLLOW_HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const FOLLOW_MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));

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

const currentInterests = [
  { id: "rugaciune", name: "Rugăciune" },
  { id: "bibletoday", name: "BibleToday" }
];

const needCategories = [
  { id: "familie", name: "Familie" },
  { id: "sanatate", name: "Sanatate" },
  { id: "copii", name: "Copii" },
  { id: "casatorie", name: "Casatorie" },
  { id: "dependente", name: "Dependente" },
  { id: "anxietate", name: "Anxietate" },
  { id: "depresie", name: "Depresie" },
  { id: "singuratate", name: "Singuratate" },
  { id: "financiar", name: "Financiar" },
  { id: "spiritual", name: "Spiritual" },
  { id: "pierdere", name: "Pierdere" },
  { id: "boala", name: "Boala" }
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
  const [crmConfig, setCrmConfig] = useState({ managers, stages, products, statuses: leadStatuses, religions, hooks, currentInterests, needCategories });
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [pageForm, setPageForm] = useState({ name: "", metaPageId: "" });
  const [pageError, setPageError] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [dataSource, setDataSource] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const [liveNotice, setLiveNotice] = useState("");
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
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("week");
  const [cursorDate, setCursorDate] = useState(startOfDay(new Date()));
  const [mobileView, setMobileView] = useState("inbox");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const mobileTabsRef = useRef(null);
  const inboxPanelRef = useRef(null);
  const calendarPanelRef = useRef(null);
  const initialMobileScrollDone = useRef(false);
  const calendarGridRef = useRef(null);
  const latestInboxSignatureRef = useRef("");
  const refreshInFlightRef = useRef(false);

  function focusMobileTabs(behavior = "smooth") {
    if (typeof window === "undefined" || window.innerWidth > 900) return;

    window.requestAnimationFrame(() => {
      const tabsTop = mobileTabsRef.current?.getBoundingClientRect().top ?? 0;
      const targetTop = Math.max(0, window.scrollY + tabsTop);
      window.scrollTo({ top: targetTop, behavior });
    });
  }

  function switchMobileView(nextView) {
    setMobileView(nextView);
    setFiltersOpen(false);
  }

  function rememberSelectedOrganization(id) {
    setSelectedOrganizationId(id || "");
    if (typeof window !== "undefined") {
      if (id) window.localStorage.setItem(SELECTED_ORGANIZATION_KEY, id);
      else window.localStorage.removeItem(SELECTED_ORGANIZATION_KEY);
    }
  }

  async function refreshCrmData({ keepManager = false, reason = "", organizationId = "" } = {}) {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      let activeOrganizationId = organizationId || selectedOrganizationId || (typeof window !== "undefined" ? window.localStorage.getItem(SELECTED_ORGANIZATION_KEY) || "" : "");
      if (!keepManager) {
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
        let nextConfig = await loadCrmConfig({ organizationId: activeOrganizationId });
        if (nextConfig.globalAdmin) {
          const activeOrganizations = (nextConfig.organizations || []).filter((organization) => organization.active !== false);
          const selectedExists = activeOrganizations.some((organization) => organization.id === activeOrganizationId);
          const fallbackOrganizationId = selectedExists ? activeOrganizationId : nextConfig.organization?.id || activeOrganizations[0]?.id || "";
          if (fallbackOrganizationId && fallbackOrganizationId !== activeOrganizationId) {
            activeOrganizationId = fallbackOrganizationId;
            nextConfig = await loadCrmConfig({ organizationId: activeOrganizationId });
          }
          rememberSelectedOrganization(activeOrganizationId);
        } else {
          activeOrganizationId = manager.organizationId || "";
          rememberSelectedOrganization(activeOrganizationId);
        }
        setCrmConfig(nextConfig);
      }

      const remoteLeads = await loadSupabaseLeads({ organizationId: activeOrganizationId });
      const nextInboxSignature = inboxSignature(remoteLeads);
      const previousInboxSignature = latestInboxSignatureRef.current;
      setLeads(remoteLeads);
      latestInboxSignatureRef.current = nextInboxSignature;
      setDataSource("supabase");
      setLoadError("");
      if ((reason === "realtime" || reason === "poll") && previousInboxSignature && previousInboxSignature !== nextInboxSignature) {
        setLiveNotice("Mesaj nou primit");
        window.setTimeout(() => setLiveNotice(""), 2200);
      }
    } catch (error) {
      console.warn("Supabase load error:", error.message);
      if (!supabase) {
        const stored = window.localStorage.getItem("crm-next-leads") || window.localStorage.getItem("crm-leads");
        const initial = stored ? JSON.parse(stored).map(normalizeLead) : makeDefaultLeads();
        setLeads(initial);
        setCrmConfig({ managers, stages, products, statuses: leadStatuses, religions, hooks, currentInterests, needCategories });
        setDataSource("local");
        setLoadError("");
        return;
      }
      setLeads([]);
      setDataSource("error");
        setLoadError(error.message || "Baza de date nu raspunde.");
    }
    finally {
      refreshInFlightRef.current = false;
    }
  }

  useEffect(() => {
    async function loadLeads() {
      try {
        await refreshCrmData();
      } finally {
        setLoaded(true);
      }
    }

    loadLeads();
  }, []);

  async function changeActiveOrganization(organizationId) {
    if (!organizationId || organizationId === selectedOrganizationId) return;
    rememberSelectedOrganization(organizationId);
    setSelectedId(null);
    setDraft(null);
    setManualLeadOpen(false);
    setPageError("");
    setPageMessage("");
    await refreshCrmData({ organizationId });
  }

  async function createPageWorkspace(event) {
    event.preventDefault();
    const name = pageForm.name.trim();
    const metaPageId = pageForm.metaPageId.trim();
    if (!name || !metaPageId) {
      setPageError("Completeaza numele paginii si Meta Page ID.");
      return;
    }

    setPageError("");
    setPageMessage("");
    try {
      const organization = await createOrganization({
        name,
        slug: slugifyInput(name),
        metaPageId,
        manychatPageId: metaPageId
      });
      setPageForm({ name: "", metaPageId: "" });
      setPageMessage("Pagina a fost adaugata.");
      rememberSelectedOrganization(organization.id);
      await refreshCrmData({ organizationId: organization.id });
    } catch (error) {
      setPageError(error.message || "Pagina nu a putut fi adaugata.");
    }
  }

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem("crm-next-leads", JSON.stringify(leads));
    }
  }, [leads, loaded]);

  useEffect(() => {
    if (!loaded || initialMobileScrollDone.current || window.innerWidth > 900) return;

    initialMobileScrollDone.current = true;
    focusMobileTabs("auto");
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !initialMobileScrollDone.current || window.innerWidth > 900) return;
    const activePanel = mobileView === "calendar" ? calendarPanelRef.current : inboxPanelRef.current;
    window.requestAnimationFrame(() => {
      activePanel?.scrollIntoView({ block: "start", behavior: "auto" });
      focusMobileTabs("auto");
    });
  }, [loaded, mobileView]);

  useEffect(() => {
    if (!loaded || !supabase || dataSource !== "supabase") return;

    let refreshTimer = null;
    let pollTimer = null;
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshCrmData({ keepManager: true, reason: "realtime" });
      }, 350);
    };

    const pollRefresh = () => {
      if (document.hidden) return;
      refreshCrmData({ keepManager: true, reason: "poll" });
    };

    pollTimer = window.setInterval(pollRefresh, 8000);

    const refreshWhenVisible = () => {
      if (!document.hidden) pollRefresh();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);

    const channel = supabase
      .channel("crm-leads-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_messages" }, scheduleRefresh)
      .subscribe();

    return () => {
      window.clearTimeout(refreshTimer);
      window.clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      supabase.removeChannel(channel);
    };
  }, [dataSource, loaded, selectedOrganizationId]);

  const filteredLeads = useMemo(() => {
    const currentManagerCode = currentManager?.code || FALLBACK_MANAGER_ID;
    return leads
      .filter((lead) => {
        if (lead.archived) return false;
        if (showUnreadOnly && !lead.unread) return false;
        if (showOverdueOnly && !isOverdueLead(lead)) return false;
        if (activeFilter !== "all" && lead.platform !== activeFilter) return false;
        if (onlyMyLeads && lead.managerId !== currentManagerCode && lead.managerId !== "unassigned") return false;
        if (managerFilter !== "all" && lead.managerId !== managerFilter) return false;
        const haystack = [lead.name, lead.platform, lead.status, lead.phone, lead.notes, ...(lead.comments || []).map((comment) => comment.text).join(" "), managerForConfig(lead.managerId).name, ...(lead.tags || [])]
          .join(" ")
          .toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
      .sort((left, right) => leadInboxTime(right) - leadInboxTime(left));
  }, [activeFilter, currentManager, crmConfig, leads, managerFilter, onlyMyLeads, search, showUnreadOnly, showOverdueOnly]);

  const visibleDates = useMemo(() => getVisibleDates(cursorDate, view), [cursorDate, view]);
  const selectedLead = leads.find((lead) => lead.id === selectedId);
  const activeManagers = crmConfig.managers.filter((manager) => manager.active);
  const activeStages = crmConfig.stages.filter((stage) => stage.active);
  const activeProducts = crmConfig.products.filter((product) => product.active);
  const activeStatuses = (crmConfig.statuses || leadStatuses).filter((status) => status.active);
  const activeReligions = (crmConfig.religions || religions).filter((religion) => religion.active);
  const activeHooks = (crmConfig.hooks || hooks).filter((hook) => hook.active);
  const activeCurrentInterests = (crmConfig.currentInterests || currentInterests).filter((interest) => interest.active);
  const activeNeedCategories = (crmConfig.needCategories || needCategories).filter((category) => category.active);
  const activeOrganizations = (crmConfig.organizations || []).filter((organization) => organization.active !== false);
  const selectedOrganization = activeOrganizations.find((organization) => organization.id === selectedOrganizationId) || crmConfig.organization;
  const unreadCount = leads.filter((lead) => lead.unread && !lead.archived).length;
  const overdueCount = leads.filter(isOverdueLead).length;
  const filtersCount = [activeFilter !== "all", managerFilter !== "all", onlyMyLeads].filter(Boolean).length;
  const filterSummaryParts = [
    activeFilter !== "all" ? platformLabel(activeFilter) : "",
    managerFilter !== "all" ? managerForConfig(managerFilter).name : "",
    onlyMyLeads ? "Ale mele" : ""
  ].filter(Boolean);
  const filterSummary = filterSummaryParts.length ? filterSummaryParts.join(" · ") : "Toate";

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

  function currentInterestForConfig(id) {
    return activeCurrentInterests.find((interest) => interest.id === id) || currentInterests.find((interest) => interest.id === id) || { id, name: id || "Neindicat" };
  }

  function needCategoryForConfig(id) {
    return activeNeedCategories.find((category) => category.id === id) || needCategories.find((category) => category.id === id) || { id, name: id || "Neindicat" };
  }

  function goToToday() {
    setCursorDate(startOfDay(new Date()));
    window.requestAnimationFrame(() => {
      calendarGridRef.current?.scrollTo({ left: 0, behavior: "smooth" });
    });
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
        saveSupabaseLead(updatedLead, { organizationId: selectedOrganizationId })
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
    const initialComment = manualLead.notes.trim();
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
      needCategory: "",
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
      notes: "",
      comments: initialComment ? [{ text: initialComment, managerId: currentManager?.code || manualLead.managerId || "unassigned", createdAt: now }] : [],
      messages: [],
      followDate: "",
      followTime: ""
    };

    setSaveState("saving");
    saveSupabaseLead(lead, { rejectDuplicateMetaUrl: true, organizationId: selectedOrganizationId })
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
    if (isTodayOrFutureFollowDate(draft.followDate)) return true;
    setWarning("Alege data si ora de follow-up pentru azi sau viitor, apoi apasa Salveaza. Un mesaj deschis din necitite nu poate fi inchis fara urmatorul pas.");
    return false;
  }

  function saveSelectedLead(options = {}) {
    if (!selectedLead || !draft) return;
    if (!options.metaLinkOnly && !canCloseSelected()) return;

    const now = toIso(new Date());
    const actorManagerId = currentManager?.code || draft.managerId || "unassigned";
    updateLead(selectedLead.id, (lead) => {
      const previousStage = lead.stage || "new";
      const previousInterest = lead.currentInterest || "";
      const previousNeedCategories = new Set(lead.needCategories || (lead.needCategory ? [lead.needCategory] : []));
      const newComment = draft.notes.trim();
      const previousProducts = new Set((lead.products || []).map((item) => item.id));
      const selectedProducts = draft.products.map((productId) => {
        const existing = (lead.products || []).find((item) => item.id === productId);
        return existing || { id: productId, status: "proposed", proposedAt: now, managerId: actorManagerId };
      });

      lead.metaUrl = draft.metaUrl.trim() || lead.metaUrl;
      lead.metaUrlVerified = Boolean(draft.metaUrlVerified || draft.metaUrl.trim());

      if (options.metaLinkOnly) {
        return lead;
      }

      const nextFollowDate = normalizeFollowInput(draft.followDate);
      const nextFollowTime = normalizeFollowTime(draft.followHour, draft.followMinute);
      lead.status = nextFollowDate ? "scheduled" : draft.status;
      lead.unread = modalSource === "inbox" ? false : lead.unread;
      lead.managerId = draft.managerId;
      lead.priority = draft.priority;
      lead.followDate = nextFollowDate;
      lead.followTime = nextFollowTime;
      lead.stage = draft.stage;
      lead.tags = draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
      if (!lead.hook || currentManager?.role === "admin") {
        lead.hook = draft.hook;
      }
      lead.needCategories = [...new Set(draft.needCategories || [])];
      lead.needCategory = lead.needCategories[0] || "";
      lead.currentInterest = draft.currentInterest;
      lead.products = selectedProducts;
      lead.customerEmail = draft.customerEmail.trim();
      lead.phone = draft.phone.trim();
      lead.notes = lead.notes || "";
      if (newComment) {
        lead.comments = [
          ...(lead.comments || []),
          { text: newComment, managerId: currentManager?.code || draft.managerId || "unassigned", createdAt: now }
        ];
      }
      lead.processedCount = (lead.processedCount || 0) + 1;
      lead.lastProcessedAt = now;

      if (previousStage !== lead.stage) {
        lead.tagHistory = [...(lead.tagHistory || []), { from: previousStage, to: lead.stage, changedAt: now, managerId: actorManagerId }];
      }
      if (previousInterest !== lead.currentInterest && lead.currentInterest) {
        lead.currentInterestHistory = [
          ...(lead.currentInterestHistory || []),
          { interest: lead.currentInterest, changedAt: now, managerId: actorManagerId }
        ];
      }
      const currentNeedCategories = new Set(lead.needCategories || []);
      const addedNeedCategories = [...currentNeedCategories].filter((category) => !previousNeedCategories.has(category));
      const removedNeedCategories = [...previousNeedCategories].filter((category) => !currentNeedCategories.has(category));
      if (!(lead.needCategoryHistory || []).length && previousNeedCategories.size) {
        lead.needCategoryHistory = [
          ...(lead.needCategoryHistory || []),
          ...[...previousNeedCategories].map((category) => ({ category, action: "added", changedAt: lead.createdAt || now, managerId: actorManagerId }))
        ];
      }
      if (addedNeedCategories.length || removedNeedCategories.length) {
        lead.needCategoryHistory = [
          ...(lead.needCategoryHistory || []),
          ...addedNeedCategories.map((category) => ({ category, action: "added", changedAt: now, managerId: actorManagerId })),
          ...removedNeedCategories.map((category) => ({ category, action: "removed", changedAt: now, managerId: actorManagerId }))
        ];
      }

      lead.activity = [
        ...(lead.activity || []),
        {
          type: "processed",
          at: now,
          managerId: actorManagerId,
          stage: lead.stage,
          followDate: lead.followDate,
          followTime: lead.followTime,
          products: selectedProducts.filter((item) => !previousProducts.has(item.id)).map((item) => item.id),
          currentInterest: previousInterest !== lead.currentInterest ? lead.currentInterest : "",
          needCategoriesAdded: addedNeedCategories,
          needCategoriesRemoved: removedNeedCategories,
          commentAdded: Boolean(newComment)
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

  async function sendSelectedMessage(text, options = {}) {
    if (!selectedLead) return;
    const savedMessage = await sendManyChatMessage(selectedLead.id, text, { ...options, organizationId: selectedOrganizationId });
    setLeads((current) => current.map((lead) => {
      if (lead.id !== selectedLead.id) return lead;
      return {
        ...lead,
        messages: [...(lead.messages || []), savedMessage]
      };
    }));
  }

  function scheduleLead(id, dateKey) {
    if (!isTodayOrFutureDateKey(dateKey)) return;
    updateLead(id, (lead) => {
      const followDate = moveFollowDateToDay(dateKey);
      return {
        ...lead,
        followDate,
        status: "scheduled",
        unread: false,
        managerId: lead.managerId || "unassigned"
      };
    });
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
        <AppNav active="crm" manager={currentManager} systemStatus={dataSource === "error" || saveState === "error" ? "error" : "ok"} />
      </div>

      {crmConfig.globalAdmin && (
        <section className="page-workspace-panel" aria-label="Pagina CRM activa">
          <div className="page-workspace-main">
            <label>
              Pagina activa
              <select value={selectedOrganizationId} onChange={(event) => changeActiveOrganization(event.target.value)}>
                {activeOrganizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>{organization.name}</option>
                ))}
              </select>
            </label>
            <div className="page-workspace-meta">
              <span>{selectedOrganization?.meta_page_id ? `Meta Page ID: ${selectedOrganization.meta_page_id}` : "Fara Meta Page ID"}</span>
              <strong>{leads.length} contacte</strong>
            </div>
          </div>

          <form className="page-workspace-form" onSubmit={createPageWorkspace}>
            <input value={pageForm.name} onChange={(event) => setPageForm({ ...pageForm, name: event.target.value })} placeholder="Nume pagina noua" />
            <input value={pageForm.metaPageId} onChange={(event) => setPageForm({ ...pageForm, metaPageId: event.target.value })} placeholder="Meta Page ID" />
            <button className="mini-btn primary" type="submit">Adauga pagina</button>
          </form>
          {(pageError || pageMessage) && <p className={pageError ? "workspace-error" : "workspace-success"}>{pageError || pageMessage}</p>}
        </section>
      )}

      <div ref={mobileTabsRef} className="mobile-crm-tabs" role="tablist" aria-label="Interfete CRM">
        <button type="button" className={mobileView === "inbox" ? "active" : ""} onClick={() => switchMobileView("inbox")}>
          Conversatii
        </button>
        <button type="button" className={mobileView === "calendar" ? "active" : ""} onClick={() => switchMobileView("calendar")}>
          Calendar
        </button>
      </div>

      <aside ref={inboxPanelRef} className={`inbox-panel ${mobileView !== "inbox" ? "mobile-hidden" : ""}`}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">Meta Inbox</p>
            <h1>Conversatii</h1>
          </div>
          <div className="panel-head-actions">
            <span className="count-badge">{filteredLeads.length}</span>
            <button type="button" className="mini-btn primary" onClick={() => setManualLeadOpen(true)}>Lead manual</button>
          </div>
        </div>

        <div className="search-wrap">
          <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Cauta dupa nume, tag sau platforma" />
        </div>

        <div className="inbox-filter-row">
          <div className="filter-dropdown">
            <button type="button" className="filter-toggle" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen}>
              <span>
                <strong>Filtre</strong>
              </span>
            </button>

            {filtersOpen && (
              <div className="filter-panel">
                <div className="quick-filters" aria-label="Filtre lead-uri">
                  {["all", "facebook", "instagram"].map((filter) => (
                    <button key={filter} className={`chip ${activeFilter === filter ? "active" : ""}`} onClick={() => { setActiveFilter(filter); setFiltersOpen(false); }}>
                      {filter === "all" ? "Toate" : platformLabel(filter)}
                    </button>
                  ))}
                </div>

                {currentManager?.role === "admin" && (
                  <label className="compact-label">
                    Manager
                    <select value={managerFilter} onChange={(event) => { setManagerFilter(event.target.value); setFiltersOpen(false); }}>
                      <option value="all">Toti managerii</option>
                      {activeManagers.map((manager) => (
                        <option key={manager.code} value={manager.code}>{manager.name}</option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="toggle-row">
                  <input type="checkbox" checked={onlyMyLeads} onChange={(event) => { setOnlyMyLeads(event.target.checked); setFiltersOpen(false); }} />
                  <span>{currentManager?.role === "admin" ? "Filtreaza pe mine" : "Doar lead-urile mele"}</span>
                </label>
              </div>
            )}
          </div>

          <label className={showUnreadOnly ? "unread-filter-toggle active" : "unread-filter-toggle"}>
            <input type="checkbox" checked={showUnreadOnly} onChange={(event) => setShowUnreadOnly(event.target.checked)} />
            <span>Necitite</span>
            <strong>{unreadCount}</strong>
          </label>

          <label className={showOverdueOnly ? "overdue-filter-toggle active" : "overdue-filter-toggle"}>
            <input type="checkbox" checked={showOverdueOnly} onChange={(event) => setShowOverdueOnly(event.target.checked)} />
            <span>Intarziate</span>
            <strong>{overdueCount}</strong>
          </label>
        </div>

        <section className="lead-list" aria-label="Lista conversatii">
          {filteredLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} lookups={{ managerForConfig, stageForConfig, productForConfig, statusForConfig }} onOpen={() => openLead(lead, "inbox")} onDragStart={(event) => event.dataTransfer.setData("text/plain", lead.id)} />
          ))}
          {!filteredLeads.length && <p className="empty-day">Nu exista lead-uri pentru filtrul ales.</p>}
        </section>
      </aside>

      <section ref={calendarPanelRef} className={`calendar-panel ${mobileView !== "calendar" ? "mobile-hidden" : ""}`}>
        {connectionMessage(dataSource, currentManager, loadError, saveState, saveError, liveNotice) && (
          <div className={`connection-banner ${dataSource === "error" || saveState === "error" ? "offline" : "online"}`}>
            <span>{connectionLabel(dataSource, currentManager)}</span>
            <span>{connectionMessage(dataSource, currentManager, loadError, saveState, saveError, liveNotice)}</span>
          </div>
        )}

        <header className="calendar-toolbar">
          <div className="calendar-title">
            <p className="eyebrow">Follow-up</p>
            <h2>{calendarTitle(visibleDates, view)}</h2>
          </div>

          <div className="toolbar-actions">
            <button className="icon-btn" onClick={() => setCursorDate(addDays(cursorDate, view === "day" ? -1 : view === "week" ? -7 : -30))} aria-label="Perioada precedenta">&lt;</button>
            <button className="today-btn" onClick={goToToday}>Azi</button>
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

        <section ref={calendarGridRef} className="calendar-grid" style={{ "--columns": visibleDates.length }} aria-label="Calendar follow-up">
          {visibleDates.map((date) => {
            const key = toDateKey(date);
            const events = leads.filter((lead) => {
              if (lead.archived || followDateKey(lead.followDate) !== key) return false;
              if (onlyMyLeads && lead.managerId !== (currentManager?.code || FALLBACK_MANAGER_ID)) return false;
              return managerFilter === "all" || lead.managerId === managerFilter;
            }).sort((left, right) => followDateSortValue(left.followDate, left.followTime) - followDateSortValue(right.followDate, right.followTime));
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
                    <EventCard key={lead.id} lead={lead} lookups={{ managerForConfig, stageForConfig, productForConfig, currentInterestForConfig }} onOpen={() => openLead(lead, "calendar")} onDragStart={(event) => event.dataTransfer.setData("text/plain", lead.id)} />
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
          warning={warning}
          config={{ managers: activeManagers, stages: activeStages, products: activeProducts, statuses: activeStatuses, religions: activeReligions, hooks: activeHooks, currentInterests: activeCurrentInterests, needCategories: activeNeedCategories }}
          isAdmin={currentManager?.role === "admin"}
          lookups={{ managerForConfig, stageForConfig, productForConfig, statusForConfig, currentInterestForConfig, needCategoryForConfig }}
          currentManager={currentManager}
          onChange={setDraft}
          onClose={closeModal}
          onArchive={archiveSelectedLead}
          onSave={saveSelectedLead}
          onSendMessage={sendSelectedMessage}
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
  const overdue = isOverdueLead(lead);
  const showStage = shouldShowStagePill(lead);
  const visibleProducts = lead.products?.slice(0, 2) || [];
  return (
    <article className="lead-card" draggable onDragStart={onDragStart} onDoubleClick={onOpen}>
      <Avatar lead={lead} className="avatar" />
      <div className="lead-main">
        <div className="lead-name-row">
          <span className="lead-name">{lead.name}</span>
          <span className={`platform-pill platform-${lead.platform}`}>{platformLabel(lead.platform)}</span>
        </div>
        <p className="lead-details">{lead.followDate ? `Urmatorul mesaj: ${formatFollowDateTime(lead.followDate, lead.followTime)}` : "Neprogramat"}</p>
        <div className="manager-line">
          <span className="manager-dot" style={{ "--manager-color": managerForConfig(lead.managerId).color }} />
          <span>{managerForConfig(lead.managerId).name}</span>
          {lead.unread && <span className="status-pill">Mesaj nou</span>}
          {overdue && <span className="status-pill overdue-pill">Intarziat</span>}
          {lead.priority === "high" && <span className="status-pill">Prioritar</span>}
        </div>
        {(showStage || visibleProducts.length > 0) && (
          <div className="tag-row">
            {showStage && <span className="tag-pill">{stageForConfig(lead.stage).name}</span>}
            {visibleProducts.map((item) => <span key={item.id} className="tag-pill">{productForConfig(item.id).name}</span>)}
          </div>
        )}
        {Boolean(lead.tags?.length) && <div className="tag-row">{lead.tags.map((tag) => <span key={tag} className="tag-pill">{tag}</span>)}</div>}
        <div className="lead-actions">
          <button className="mini-btn primary" onClick={onOpen}>Detalii</button>
        </div>
      </div>
    </article>
  );
}

function EventCard({ lead, lookups, onOpen, onDragStart }) {
  const { managerForConfig, stageForConfig, productForConfig, currentInterestForConfig } = lookups;
  const manager = managerForConfig(lead.managerId);
  const isAssigned = lead.managerId && lead.managerId !== "unassigned";
  const currentInterest = lead.currentInterest ? currentInterestForConfig(lead.currentInterest).name : "Interes neindicat";
  const followTime = formatFollowTime(lead.followTime);
  const overdue = isOverdueLead(lead);
  const showStage = shouldShowStagePill(lead);
  return (
    <article className={`event-card ${lead.platform} ${lead.priority === "high" ? "priority-high" : ""}`} draggable onDragStart={onDragStart}>
      <div className="event-card-head">
        <Avatar lead={lead} className="event-avatar" />
        <div className="event-title">
          <strong>{lead.name}</strong>
          <span>{currentInterest}</span>
        </div>
      </div>
      {(followTime || lead.unread || overdue) && (
        <div className="event-badges">
          {followTime && <span className="event-time">Ora {followTime}</span>}
          {lead.unread && <span className="status-pill unread-pill">Mesaj nou</span>}
          {overdue && <span className="status-pill overdue-pill">Intarziat</span>}
        </div>
      )}
      {isAssigned && (
        <div className="manager-line">
          <span className="manager-dot" style={{ "--manager-color": manager.color }} />
          <span>{manager.name}</span>
        </div>
      )}
      <div className="event-actions">
        {showStage && <span className="tag-pill">{stageForConfig(lead.stage).name}</span>}
        <button className="mini-btn primary" onClick={onOpen}>Detalii</button>
      </div>
      {Boolean(lead.products?.length) && (
        <div className="tag-row">
          {lead.products.slice(0, 2).map((item) => <span key={item.id} className="tag-pill">{productForConfig(item.id).name}</span>)}
        </div>
      )}
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

function ClientModal({ lead, draft, requiresFollowUp, warning, config, isAdmin, lookups, currentManager, onChange, onClose, onArchive, onSave, onSendMessage }) {
  const [activeTab, setActiveTab] = useState("details");
  const [messageDraft, setMessageDraft] = useState("");
  const [messageImage, setMessageImage] = useState(null);
  const [messageState, setMessageState] = useState("idle");
  const [messageError, setMessageError] = useState("");
  const hasMetaLink = Boolean(lead.metaUrlVerified && lead.metaUrl && lead.metaUrl !== "#");

  function update(field, value) {
    onChange({ ...draft, [field]: value });
  }

  function updateFollowHour(value) {
    onChange({ ...draft, followHour: value, followMinute: value ? draft.followMinute || "00" : "" });
  }

  function updateFollowMinute(value) {
    onChange({ ...draft, followMinute: value });
  }

  function toggleNeedCategory(categoryId) {
    onChange((currentDraft) => {
      const selected = new Set(currentDraft.needCategories || []);
      if (selected.has(categoryId)) {
        selected.delete(categoryId);
      } else {
        selected.add(categoryId);
      }
      return { ...currentDraft, needCategories: [...selected] };
    });
  }

  async function submitMessage(event) {
    event?.preventDefault();
    const text = messageDraft.trim();
    if ((!text && !messageImage) || messageState === "sending") return;

    try {
      setMessageState("sending");
      setMessageError("");
      await onSendMessage(text, { image: messageImage });
      setMessageDraft("");
      setMessageImage(null);
      setMessageState("sent");
      window.setTimeout(() => setMessageState("idle"), 1400);
    } catch (error) {
      setMessageError(error.message || "Mesajul nu a putut fi trimis.");
      setMessageState("error");
    }
  }

  return (
    <div className="dialog-backdrop">
      <section className="client-dialog">
        <div className="client-modal">
          <button type="button" className="close-btn" onClick={onClose} aria-label="Inchide">x</button>
          <div className="modal-top">
            <Avatar lead={lead} />
            <div>
              <p className="eyebrow">{platformLabel(lead.platform)}</p>
              <h3>{lead.name}</h3>
              {hasMetaLink && <a className="meta-open-btn" href={lead.metaUrl} target="_blank" rel="noreferrer">Deschide in Meta Business Suite</a>}
            </div>
          </div>

          <div className="modal-tabs" role="tablist" aria-label="Client">
            <button type="button" className={activeTab === "details" ? "active" : ""} onClick={() => setActiveTab("details")}>Detalii</button>
            <button type="button" className={activeTab === "conversation" ? "active" : ""} onClick={() => setActiveTab("conversation")}>Conversatie</button>
          </div>

          {requiresFollowUp && (
            <div className="modal-info">
              Mesaj deschis din necitite. Alege data si ora de follow-up pentru azi sau viitor inainte de inchidere.
            </div>
          )}
          {warning && <p className="modal-warning">{warning}</p>}

          {activeTab === "details" ? (
          <>

          <div className="field-grid">
            <label>Status<select value={draft.status} onChange={(event) => update("status", event.target.value)}>{config.statuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}</select></label>
            <label>Manager responsabil<select value={draft.managerId} onChange={(event) => update("managerId", event.target.value)}><option value="unassigned">Neatribuit</option>{config.managers.map((manager) => <option key={manager.code} value={manager.code}>{manager.name}</option>)}</select></label>
          </div>

          <div className="field-grid">
            <FollowDatePicker value={draft.followDate} onChange={(value) => update("followDate", value)} />
            <div className="time-select-grid">
              <label>Ora<select value={draft.followHour} onChange={(event) => updateFollowHour(event.target.value)}><option value="">Fara ora</option>{FOLLOW_HOUR_OPTIONS.map((hour) => <option key={hour} value={hour}>{hour}</option>)}</select></label>
              <label>Minute<select value={draft.followMinute} onChange={(event) => updateFollowMinute(event.target.value)} disabled={!draft.followHour}>{FOLLOW_MINUTE_OPTIONS.map((minute) => <option key={minute} value={minute}>{minute}</option>)}</select></label>
            </div>
          </div>

          <div className="field-grid">
            <label>Etapa<select value={draft.stage} onChange={(event) => update("stage", event.target.value)}>{config.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></label>
            <label>Interes actual<select value={draft.currentInterest} onChange={(event) => update("currentInterest", event.target.value)}><option value="">Neindicat</option>{config.currentInterests.map((interest) => <option key={interest.id} value={interest.id}>{interest.name}</option>)}</select></label>
          </div>

          <div className="field-grid">
            <label>Prioritate<select value={draft.priority} onChange={(event) => update("priority", event.target.value)}><option value="normal">Normala</option><option value="high">Inalta</option><option value="low">Joasa</option></select></label>
            <NeedCategorySelector
              categories={config.needCategories}
              selected={draft.needCategories || []}
              onToggle={toggleNeedCategory}
            />
          </div>

          <div className="field-grid">
            <label>Religie<select value={draft.tags} onChange={(event) => update("tags", event.target.value)}><option value="">Neindicat</option>{config.religions.map((religion) => <option key={religion.id} value={religion.name}>{religion.name}</option>)}</select></label>
            <label className="locked-field">
              Hook
              <select value={lead.hook && !isAdmin ? lead.hook : draft.hook} onChange={(event) => update("hook", event.target.value)} disabled={Boolean(lead.hook) && !isAdmin}>
                <option value="">Neindicat</option>
                {config.hooks.map((hook) => <option key={hook.id} value={hook.id}>{hook.name}</option>)}
              </select>
            </label>
          </div>

          <label>Produs propus<select value={draft.products[0] || ""} onChange={(event) => update("products", event.target.value ? [event.target.value] : [])}><option value="">Niciun produs</option>{config.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>

          <div className="client-meta-grid">
            <span>Creat: {formatDateTime(lead.createdAt)}</span>
            <span>Prelucrari: {lead.processedCount || 0}</span>
            <span>Ultima prelucrare: {lead.lastProcessedAt ? formatDateTime(lead.lastProcessedAt) : "-"}</span>
          </div>

          <CommentsPanel lead={lead} draft={draft} currentManager={currentManager} lookups={lookups} onChange={update} />

          <div className="field-grid">
            <label>Email client<input value={draft.customerEmail} onChange={(event) => update("customerEmail", event.target.value)} placeholder="email oferit de client" /></label>
            <label>Telefon / contact extra<input value={draft.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+373..." /></label>
          </div>
          <label>Link Meta direct<input value={draft.metaUrl} onChange={(event) => update("metaUrl", event.target.value)} placeholder="https://business.facebook.com/latest/inbox/all?..." /></label>

          <div className="modal-actions">
            <button type="button" className="danger-btn" onClick={onArchive}>Arhiveaza</button>
            <button type="button" className="primary-btn" onClick={() => onSave()}>Salveaza</button>
          </div>

          <ClientHistory lead={lead} lookups={lookups} />
          </>
          ) : (
          <MessagesPanel
            lead={lead}
            draft={messageDraft}
            image={messageImage}
            state={messageState}
            error={messageError}
            lookups={lookups}
            onChange={setMessageDraft}
            onImageChange={setMessageImage}
            onSubmit={submitMessage}
          />
          )}
        </div>
      </section>
    </div>
  );
}

function FollowDatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);
  const selectedDate = parseFollowDate(value);
  const [viewDate, setViewDate] = useState(selectedDate || new Date());
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = addDays(monthStart, -((monthStart.getDay() + 6) % 7));
  const dayCells = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));

  useEffect(() => {
    if (selectedDate) setViewDate(selectedDate);
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!pickerRef.current?.contains(event.target)) setOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function chooseDate(date) {
    onChange(toDateKey(date));
    setOpen(false);
  }

  return (
    <div className="follow-date-field" ref={pickerRef}>
      <span className="field-label">Data follow-up</span>
      <button type="button" className={open ? "follow-date-trigger open" : "follow-date-trigger"} onClick={() => setOpen((state) => !state)} aria-expanded={open}>
        <span>{selectedDate ? formatLongDate(selectedDate) : "Alege data"}</span>
        <span className="follow-date-icon">Calendar</span>
      </button>
      {open && (
        <div className="follow-date-popover">
          <div className="follow-date-head">
            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>‹</button>
            <strong>{new Intl.DateTimeFormat("ro-RO", { month: "long", year: "numeric" }).format(viewDate)}</strong>
            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>›</button>
          </div>
          <div className="follow-date-weekdays">
            {["Lu", "Ma", "Mi", "Jo", "Vi", "Sa", "Du"].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="follow-date-days">
            {dayCells.map((date) => {
              const key = toDateKey(date);
              const outside = date.getMonth() !== viewDate.getMonth();
              const selected = value === key;
              const today = isSameDay(date, new Date());
              return (
                <button
                  key={key}
                  type="button"
                  className={`${outside ? "muted" : ""} ${selected ? "selected" : ""} ${today ? "today" : ""}`}
                  onClick={() => chooseDate(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="follow-date-actions">
            <button type="button" onClick={() => chooseDate(new Date())}>Azi</button>
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}>Sterge</button>
          </div>
        </div>
      )}
    </div>
  );
}

function NeedCategorySelector({ categories, selected, onToggle }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selectedSet = new Set(selected || []);
  const selectedCategories = (selected || [])
    .map((categoryId) => categories.find((category) => category.id === categoryId))
    .filter(Boolean);
  const orderedCategories = [
    ...selectedCategories,
    ...categories.filter((category) => !selectedSet.has(category.id))
  ];
  const summary = selectedCategories.length
    ? selectedCategories.map((category) => category.name).join(", ")
    : "Neindicat";

  useEffect(() => {
    function handlePointerDown(event) {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="need-category-field" ref={dropdownRef}>
      <span className="field-label">Need Category</span>
      <button
        type="button"
        className={open ? "need-category-trigger open" : "need-category-trigger"}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className={selectedCategories.length ? "need-category-summary" : "need-category-summary empty"}>{summary}</span>
        <span className="need-category-count">{selectedCategories.length || 0}</span>
      </button>
      {open && (
        <div className="need-category-options" role="group" aria-label="Need Category">
          {orderedCategories.map((category, index) => {
            const isSelected = selectedSet.has(category.id);
            return (
              <button
                key={category.id}
                type="button"
                className={isSelected ? "need-category-option selected" : "need-category-option"}
                onClick={() => onToggle(category.id)}
                aria-pressed={isSelected}
              >
                <span>{category.name}</span>
                {isSelected && <span className="need-category-check">{index === 0 ? "Prima" : "Selectat"}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClientHistory({ lead, lookups }) {
  const [open, setOpen] = useState(false);
  const items = buildClientHistory(lead, lookups);

  return (
    <section className="modal-section history-section">
      <button type="button" className="history-toggle" onClick={() => setOpen((value) => !value)}>
        <span>
          <span className="eyebrow">Istoric client</span>
          <strong>{items.length} evenimente</strong>
        </span>
        <span>{open ? "Ascunde" : "Deschide"}</span>
      </button>
      {open && (
        <div className="history-list">
          {items.map((item, index) => (
            <article key={`${item.at}-${index}`} className={item.kind ? `history-item ${item.kind}` : "history-item"}>
              <span>{formatDateTime(item.at)}</span>
              <strong>{item.title}</strong>
              {item.detail && <p>{item.detail}</p>}
            </article>
          ))}
          {!items.length && <p className="empty-history">Nu exista istoric pentru acest client.</p>}
        </div>
      )}
    </section>
  );
}

function MessagesPanel({ lead, draft, image, state, error, lookups, onChange, onImageChange, onSubmit }) {
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [mobileInputMode, setMobileInputMode] = useState(false);
  const messages = [...(lead.messages || [])].sort((left, right) => new Date(left.sentAt || left.createdAt).getTime() - new Date(right.sentAt || right.createdAt).getTime());
  const canSend = (Boolean(draft.trim()) || Boolean(image)) && state !== "sending";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [lead.id, messages.length]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px), (pointer: coarse)");
    function updateMode() {
      setMobileInputMode(query.matches);
    }

    updateMode();
    query.addEventListener("change", updateMode);
    return () => query.removeEventListener("change", updateMode);
  }, []);

  function handleMessageKeyDown(event) {
    if (mobileInputMode) return;
    if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
    event.preventDefault();
    if (canSend) onSubmit();
  }

  function handleImagePick(event) {
    const file = event.target.files?.[0] || null;
    if (file) onImageChange(file);
    event.target.value = "";
  }

  return (
    <section className="modal-section messages-section">
      <div className="comments-head">
        <div>
          <p className="eyebrow">Mesaje</p>
        </div>
        <span className="comment-author">{messages.length} mesaje</span>
      </div>

      <div className="messages-list" aria-label="Conversatie client">
        {messages.map((message) => {
          const outgoing = message.direction === "outgoing";
          const content = parseChatMessageBody(message.body);
          return (
            <article key={message.id || `${message.direction}-${message.sentAt}-${message.body}`} className={`message-bubble ${outgoing ? "outgoing" : "incoming"}`}>
              {content.imageUrl && <img className="message-image" src={content.imageUrl} alt="Imagine trimisa in conversatie" loading="lazy" />}
              {content.text && <p>{content.text}</p>}
              <div className="message-meta">
                <span>{outgoing ? lookups.managerForConfig(message.managerId || lead.managerId).name : lead.name}</span>
                <span>{formatDateTime(message.sentAt || message.createdAt)}</span>
              </div>
              {message.status === "failed" && <span className="message-error">Netramis</span>}
            </article>
          );
        })}
        <span ref={messagesEndRef} aria-hidden="true" />
        {!messages.length && <p className="empty-history">Inca nu exista mesaje salvate pentru acest client.</p>}
      </div>

      <div className="message-compose">
        {image && (
          <div className="image-attachment-preview">
            <span>{image.name}</span>
            <button type="button" onClick={() => onImageChange(null)}>Scoate poza</button>
          </div>
        )}
        <textarea
          value={draft}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleMessageKeyDown}
          rows={3}
          placeholder="Scrie mesajul pentru client"
          autoComplete="new-password"
          name={`chat-message-${lead.id}`}
          autoSave="off"
          data-form-type="other"
          data-lpignore="true"
          data-1p-ignore="true"
          data-bwignore="true"
          aria-autocomplete="none"
          autoCorrect="on"
          autoCapitalize="sentences"
          spellCheck="true"
          inputMode="text"
          enterKeyHint={mobileInputMode ? "enter" : "send"}
          aria-label="Mesaj catre client"
        />
        <div className="message-compose-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif"
            className="visually-hidden"
            onChange={handleImagePick}
          />
          <button type="button" className="attach-btn" onClick={() => fileInputRef.current?.click()} disabled={state === "sending"}>
            Poza
          </button>
          {error && <span className="message-error">{error}</span>}
          {state === "sent" && <span className="message-ok">Trimis</span>}
          <button type="button" className="primary-btn" onClick={onSubmit} disabled={!canSend}>{state === "sending" ? "Se trimite..." : "Trimite mesaj"}</button>
        </div>
      </div>
    </section>
  );
}

function CommentsPanel({ lead, draft, currentManager, lookups, onChange }) {
  const comments = buildCommentList(lead);
  const authorName = currentManager?.name || lookups.managerForConfig(currentManager?.code || lead.managerId).name;

  return (
    <section className="modal-section comments-section">
      <div className="comments-head">
        <div>
          <p className="eyebrow">Comentarii</p>
          <h3>Istoric comentarii</h3>
        </div>
        <span className="comment-author">{authorName}</span>
      </div>

      <label className="comment-compose">
        Comentariu nou
        <textarea value={draft.notes} onChange={(event) => onChange("notes", event.target.value)} rows={3} placeholder="Scrie comentariul intern" />
      </label>

      <div className="comments-list" aria-label="Lista comentarii">
        {comments.map((comment, index) => (
          <article key={`${comment.createdAt}-${index}`} className="comment-bubble">
            <div className="comment-meta">
              <strong>{comment.managerId ? lookups.managerForConfig(comment.managerId).name : comment.author}</strong>
              <span>{formatDateTime(comment.createdAt)}</span>
            </div>
            <p>{comment.text}</p>
          </article>
        ))}
        {!comments.length && <p className="empty-history">Nu exista comentarii pentru acest client.</p>}
      </div>
    </section>
  );
}

function buildCommentList(lead) {
  const comments = [...(lead.comments || [])];
  if (lead.notes) {
    comments.push({
      text: lead.notes,
      author: "Comentariu vechi",
      managerId: "",
      createdAt: lead.lastProcessedAt || lead.createdAt
    });
  }
  return comments
    .filter((comment) => comment.text && comment.createdAt)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
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
      detail: `${entry.from ? lookups.stageForConfig(entry.from).name : "Fara etapa"} -> ${lookups.stageForConfig(entry.to).name}`
    });
  });

  (lead.products || []).forEach((product) => {
    items.push({
      at: product.proposedAt || lead.createdAt,
      title: "Produs propus",
      detail: `${lookups.productForConfig(product.id).name} · ${product.status || "proposed"}`
    });
  });

  (lead.currentInterestHistory || []).forEach((entry) => {
    items.push({
      at: entry.changedAt,
      title: "Interes actual",
      detail: lookups.currentInterestForConfig(entry.interest).name
    });
  });

  const needHistory = lead.needCategoryHistory || [];
  const firstNeedEntry = [...needHistory]
    .filter((entry) => entry.action !== "removed")
    .sort((left, right) => new Date(left.changedAt).getTime() - new Date(right.changedAt).getTime())[0];

  needHistory.forEach((entry) => {
    const isFirst = firstNeedEntry && firstNeedEntry.changedAt === entry.changedAt && firstNeedEntry.category === entry.category;
    items.push({
      at: entry.changedAt,
      title: entry.action === "removed" ? "Need category scoasa" : isFirst ? "Prima need category selectata" : "Need category adaugata",
      detail: lookups.needCategoryForConfig(entry.category).name,
      kind: entry.action === "removed" ? "history-removed" : isFirst ? "history-first" : "history-added"
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
    if (activity.currentInterest) details.push(`Interes: ${lookups.currentInterestForConfig(activity.currentInterest).name}`);
    if (activity.needCategoriesAdded?.length) details.push(`Need +: ${activity.needCategoriesAdded.map((id) => lookups.needCategoryForConfig(id).name).join(", ")}`);
    if (activity.needCategoriesRemoved?.length) details.push(`Need -: ${activity.needCategoriesRemoved.map((id) => lookups.needCategoryForConfig(id).name).join(", ")}`);
    if (activity.followDate) details.push(`Follow-up: ${formatFollowDateTime(activity.followDate, activity.followTime)}`);
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
    currentInterest: lead.currentInterest || "",
    needCategory: lead.needCategory || "",
    needCategories: Array.isArray(lead.needCategories) ? lead.needCategories : lead.needCategory ? [lead.needCategory] : [],
    needCategoryHistory: Array.isArray(lead.needCategoryHistory) ? lead.needCategoryHistory : [],
    createdAt: lead.createdAt || now,
    firstMessageAt: lead.firstMessageAt || lead.createdAt || now,
    processedCount: lead.processedCount || 0,
    lastProcessedAt: lead.lastProcessedAt || "",
    tagHistory: Array.isArray(lead.tagHistory) ? lead.tagHistory : [],
    currentInterestHistory: Array.isArray(lead.currentInterestHistory) ? lead.currentInterestHistory : [],
    comments: Array.isArray(lead.comments) ? lead.comments : [],
    messages: Array.isArray(lead.messages) ? lead.messages : [],
    products: Array.isArray(lead.products) ? lead.products.map((item) => (typeof item === "string" ? { id: item, status: "proposed", proposedAt: now, managerId: lead.managerId || "unassigned" } : item)) : [],
    activity: Array.isArray(lead.activity) ? lead.activity : [],
    followDate: followDateInputValue(lead.followDate),
    followTime: lead.followTime || extractFollowTime(lead.followDate)
  };
}

function leadInboxTime(lead) {
  const lastMessage = (lead.messages || []).reduce((latest, message) => {
    const value = Date.parse(message.sentAt || message.createdAt || "");
    return Number.isNaN(value) ? latest : Math.max(latest, value);
  }, 0);
  const directValue = Date.parse(lead.lastMessageAt || lead.firstMessageAt || lead.createdAt || "");
  return Math.max(lastMessage, Number.isNaN(directValue) ? 0 : directValue);
}

function inboxSignature(leads) {
  const unreadLeads = leads.filter((lead) => lead.unread && !lead.archived);
  const latest = unreadLeads.reduce((max, lead) => Math.max(max, leadInboxTime(lead)), 0);
  return `${unreadLeads.length}:${latest}`;
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
    needCategory: "",
    needCategories: [],
    currentInterest: "",
    tags: "",
    notes: ""
  };
}

function makeLeadDraft(lead) {
  return {
    status: lead.status,
    managerId: lead.managerId || "unassigned",
    priority: lead.priority || "normal",
    followDate: followDateInputValue(lead.followDate),
    ...followTimeInputValue(lead.followTime || extractFollowTime(lead.followDate)),
    stage: lead.stage || "new",
    tags: (lead.tags || []).join(", "),
    hook: lead.hook || "",
    needCategory: lead.needCategory || "",
    needCategories: Array.isArray(lead.needCategories) ? lead.needCategories : lead.needCategory ? [lead.needCategory] : [],
    currentInterest: lead.currentInterest || "",
    metaUrl: lead.metaUrlVerified ? lead.metaUrl || "" : "",
    metaUrlVerified: Boolean(lead.metaUrlVerified),
    customerEmail: lead.customerEmail || "",
    phone: lead.phone || "",
    notes: "",
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

function connectionLabel(dataSource, manager) {
  if (dataSource === "error") return "Eroare de conectare";
  if (dataSource !== "supabase") return "Mod local";
  return manager?.role === "admin" ? "Conectat la baza de date" : "Totul functioneaza";
}

function connectionMessage(dataSource, manager, loadError, saveState, saveError, liveNotice) {
  if (dataSource === "error") return loadError || "Verifica conexiunea.";
  if (saveState === "error") return `Eroare: ${saveError || "salvare esuata"}`;
  if (saveState === "saving") return "Se salveaza...";
  if (saveState === "saved") return "Salvat";
  if (liveNotice) return liveNotice;
  if (manager?.role === "admin") return "Gata";
  return "";
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

function parseFollowDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return parseKey(value);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function followDateKey(value) {
  const date = parseFollowDate(value);
  return date ? toDateKey(date) : "";
}

function followDateSortValue(value, timeValue = "") {
  const date = parseFollowDate(value);
  if (!date) return 0;
  if (timeValue) {
    const [hours, minutes] = timeValue.split(":").map(Number);
    date.setHours(hours || 0, minutes || 0, 0, 0);
  }
  return date.getTime();
}

function followDateInputValue(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = parseFollowDate(value);
  if (!date) return "";
  return toDateKey(date);
}

function followTimeInputValue(value) {
  if (!value) return { followHour: "", followMinute: "" };
  const [hour = "", minute = "00"] = String(value).split(":");
  return {
    followHour: hour.padStart(2, "0"),
    followMinute: minute.padStart(2, "0")
  };
}

function normalizeFollowInput(dateValue) {
  if (!dateValue) return "";
  return followDateInputValue(dateValue);
}

function normalizeFollowTime(hourValue = "", minuteValue = "00") {
  if (!hourValue) return "";
  return `${hourValue}:${minuteValue || "00"}`;
}

function moveFollowDateToDay(dateKey) {
  return dateKey;
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

function isOverdueLead(lead) {
  if (!lead || lead.archived || !lead.followDate) return false;
  const date = parseFollowDate(lead.followDate);
  if (!date) return false;
  return startOfDay(date).getTime() < startOfDay(new Date()).getTime();
}

function shouldShowStagePill(lead) {
  const stage = lead?.stage || "new";
  if (stage !== "new") return true;
  return !lead?.lastProcessedAt && (lead?.processedCount || 0) === 0;
}

function parseChatMessageBody(body) {
  const value = String(body || "");
  if (!value.startsWith("[image] ")) return { text: value, imageUrl: "" };
  const lines = value.slice(8).split("\n");
  const imageUrl = lines.shift()?.trim() || "";
  return { imageUrl, text: lines.join("\n").trim() };
}

function isTodayOrFutureFollowDate(value) {
  const date = parseFollowDate(value);
  if (!date) return false;
  return startOfDay(date).getTime() >= startOfDay(new Date()).getTime();
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

function formatFollowDateTime(value, timeValue = "") {
  const date = parseFollowDate(value);
  if (!date) return "-";
  const options = timeValue
    ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short" };
  if (timeValue) {
    const [hours, minutes] = timeValue.split(":").map(Number);
    date.setHours(hours || 0, minutes || 0, 0, 0);
  }
  return new Intl.DateTimeFormat("ro-RO", options).format(date);
}

function formatFollowTime(value) {
  return value || "";
}

function hasExplicitFollowTime(value) {
  return Boolean(value && !/^\d{4}-\d{2}-\d{2}$/.test(value));
}

function extractFollowTime(value) {
  if (!hasExplicitFollowTime(value)) return "";
  const date = parseFollowDate(value);
  if (!date) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
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
    .map((lead) => Math.max(0, Math.round(((parseFollowDate(lead.followDate)?.getTime() || 0) - new Date(lead.firstMessageAt).getTime()) / DAY_MS)));
  if (!values.length) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}
