export const DAY_MS = 24 * 60 * 60 * 1000;

export const managers = [
  { id: "unassigned", name: "Neatribuit", color: "#8a97aa" },
  { id: "diana", name: "Diana", color: "#1e8f72" },
  { id: "alex", name: "Alex", color: "#2772d8" },
  { id: "marina", name: "Marina", color: "#cc3d5a" }
];

export const stages = [
  { id: "new", name: "Nou" },
  { id: "interested", name: "Interesat" },
  { id: "proposal", name: "Propunere facuta" },
  { id: "followup", name: "Follow-up" },
  { id: "accepted", name: "Acceptat" },
  { id: "no-response", name: "Nu raspunde" },
  { id: "reactivated", name: "Reactivat" },
  { id: "closed", name: "Inchis" }
];

export const products = [
  { id: "biblical-courses", name: "Cursuri biblice" },
  { id: "health-prayer", name: "Rugaciune sanatate" },
  { id: "meeting", name: "Intalnire" },
  { id: "consultation", name: "Consultatie" }
];

export const leadStatuses = [
  { id: "new", name: "Nou" },
  { id: "scheduled", name: "Programat" },
  { id: "reactivated", name: "Reactivat" },
  { id: "contacted", name: "Contactat" },
  { id: "closed", name: "Inchis" }
];

export const religions = [
  { id: "adventist", name: "Adventist" },
  { id: "ortodox", name: "Ortodox" },
  { id: "catolic", name: "Catolic" },
  { id: "alta", name: "Alta" }
];

export const hooks = [
  { id: "sanatate", name: "Sanatate" },
  { id: "familie", name: "Familie" },
  { id: "intrebari-teologice", name: "Intrebari teologice" },
  { id: "critice", name: "Critice" }
];

export const currentInterests = [
  { id: "rugaciune", name: "Rugăciune" },
  { id: "bibletoday", name: "BibleToday" }
];

export const needCategories = [
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

export function makeDefaultLeads() {
  return [
    {
      id: "lead-1",
      name: "Ana Munteanu",
      platform: "instagram",
      avatar: "https://i.pravatar.cc/120?img=47",
      metaUrl: "https://business.facebook.com/latest/inbox/all?asset_id=demo-ana",
      email: "",
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
      email: "",
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
      email: "",
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
      email: "",
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
      email: "",
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

export function loadStoredLeads() {
  const stored = window.localStorage.getItem("crm-next-leads") || window.localStorage.getItem("crm-leads");
  return stored ? JSON.parse(stored).map(normalizeLead) : makeDefaultLeads();
}

export function normalizeLead(lead) {
  const now = toIso(new Date());
  return {
    ...lead,
    archived: lead.archived || false,
    unread: lead.unread ?? lead.status === "new",
    managerId: lead.managerId || "unassigned",
    priority: lead.priority || "normal",
    stage: lead.stage || "new",
    createdAt: lead.createdAt || now,
    firstMessageAt: lead.firstMessageAt || lead.createdAt || now,
    processedCount: lead.processedCount || 0,
    lastProcessedAt: lead.lastProcessedAt || "",
    tagHistory: Array.isArray(lead.tagHistory) ? lead.tagHistory : [],
    products: Array.isArray(lead.products) ? lead.products.map((item) => (typeof item === "string" ? { id: item, status: "proposed", proposedAt: now, managerId: lead.managerId || "unassigned" } : item)) : [],
    email: lead.email || "",
    customerEmail: lead.customerEmail || "",
    hook: lead.hook || "",
    needCategory: lead.needCategory || "",
    activity: Array.isArray(lead.activity) ? lead.activity : []
  };
}

export function buildStats(leads, config = { managers, stages, products, currentInterests, needCategories }) {
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
    managers: config.managers.map((manager) => {
      const managerCode = manager.code || manager.id;
      const managerLeads = leads.filter((lead) => lead.managerId === managerCode);
      return [manager.name, managerLeads.filter((lead) => !lead.archived).length, managerLeads.length, managerLeads.filter((lead) => lead.unread && !lead.archived).length, managerLeads.filter((lead) => lead.archived).length];
    }),
    managerActivity: config.managers.map((manager) => {
      const managerCode = manager.code || manager.id;
      return [
        manager.name,
        countManagerProcessed(leads, managerCode),
        countManagerOutgoingMessages(leads, managerCode),
        countManagerComments(leads, managerCode),
        countManagerStageChanges(leads, managerCode),
        countManagerInterestChanges(leads, managerCode),
        countManagerProducts(leads, managerCode),
        countManagerArchiveActions(leads, managerCode)
      ];
    }),
    stages: config.stages.map((stage) => {
      const stageLeads = leads.filter((lead) => lead.stage === stage.id);
      return [stage.name, stageLeads.length, stageLeads.reduce((sum, lead) => sum + (lead.processedCount || 0), 0)];
    }),
    products: config.products.map((product) => {
      const proposed = leads.flatMap((lead) => lead.products || []).filter((item) => item.id === product.id);
      return [product.name, proposed.length, proposed.filter((item) => item.status === "accepted").length];
    }),
    currentInterests: (config.currentInterests || currentInterests).map((interest) => {
      const activeLeads = leads.filter((lead) => !lead.archived && lead.currentInterest === interest.id);
      const historyCount = leads.flatMap((lead) => lead.currentInterestHistory || []).filter((entry) => entry.interest === interest.id).length;
      return [interest.name, activeLeads.length, historyCount];
    })
  };
}

function countManagerProcessed(leads, managerCode) {
  return leads.reduce((sum, lead) => {
    const processedEvents = (lead.activity || []).filter((entry) => entry.type === "processed");
    const managerEvents = processedEvents.filter((entry) => entry.managerId === managerCode).length;
    if (processedEvents.length) return sum + managerEvents;
    return sum + (lead.managerId === managerCode ? lead.processedCount || 0 : 0);
  }, 0);
}

function countManagerOutgoingMessages(leads, managerCode) {
  return leads.flatMap((lead) => lead.messages || []).filter((message) => message.managerId === managerCode && message.direction === "outgoing").length;
}

function countManagerComments(leads, managerCode) {
  return leads.flatMap((lead) => lead.comments || []).filter((comment) => comment.managerId === managerCode).length;
}

function countManagerStageChanges(leads, managerCode) {
  return leads.flatMap((lead) => lead.tagHistory || []).filter((entry) => entry.managerId === managerCode).length;
}

function countManagerInterestChanges(leads, managerCode) {
  return leads.flatMap((lead) => lead.currentInterestHistory || []).filter((entry) => entry.managerId === managerCode).length;
}

function countManagerProducts(leads, managerCode) {
  return leads.flatMap((lead) => lead.products || []).filter((product) => product.managerId === managerCode).length;
}

function countManagerArchiveActions(leads, managerCode) {
  return leads.flatMap((lead) => lead.activity || []).filter((entry) => entry.managerId === managerCode && ["archived", "restored"].includes(entry.type)).length;
}

export function managerFor(id) {
  return managers.find((manager) => manager.id === id) || managers[0];
}

export function stageFor(id) {
  return stages.find((stage) => stage.id === id) || stages[0];
}

export function productFor(id) {
  return products.find((product) => product.id === id) || { id, name: id };
}

export function leadStatusFor(id) {
  return leadStatuses.find((status) => status.id === id) || { id, name: id || "Nou" };
}

export function getVisibleDates(cursorDate, view) {
  const count = view === "day" ? 1 : view === "month" ? 30 : 7;
  return Array.from({ length: count }, (_, index) => addDays(cursorDate, index));
}

export function calendarTitle(dates, view) {
  if (view === "day") return formatLongDate(dates[0]);
  return `${formatShortDate(dates[0])} - ${formatShortDate(dates[dates.length - 1])}`;
}

export function platformLabel(platform) {
  return platform === "facebook" ? "Facebook" : "Instagram";
}

export function statusLabel(status) {
  return leadStatusFor(status).name;
}

export function toDateKey(date) {
  const safe = startOfDay(date);
  return `${safe.getFullYear()}-${String(safe.getMonth() + 1).padStart(2, "0")}-${String(safe.getDate()).padStart(2, "0")}`;
}

export function toIso(date) {
  return date.toISOString();
}

export function addDaysIso(date, days) {
  return toIso(addDays(date, days));
}

export function addDaysKey(date, days) {
  return toDateKey(addDays(date, days));
}

export function parseKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function isSameDay(left, right) {
  return toDateKey(left) === toDateKey(right);
}

export function isTodayOrFutureDateKey(dateKey) {
  if (!dateKey) return false;
  return parseKey(dateKey).getTime() >= startOfDay(new Date()).getTime();
}

export function weekday(date) {
  return new Intl.DateTimeFormat("ro-RO", { weekday: "short" }).format(date);
}

export function monthName(date) {
  return new Intl.DateTimeFormat("ro-RO", { month: "short" }).format(date);
}

export function formatShortDate(date) {
  return new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short" }).format(date);
}

export function formatLongDate(date) {
  return new Intl.DateTimeFormat("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function averageFollowupDays(leads) {
  const values = leads
    .filter((lead) => lead.firstMessageAt && lead.followDate)
    .map((lead) => Math.max(0, Math.round((parseKey(lead.followDate).getTime() - new Date(lead.firstMessageAt).getTime()) / DAY_MS)));
  if (!values.length) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}
