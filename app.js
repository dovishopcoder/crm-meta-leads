const DAY_MS = 24 * 60 * 60 * 1000;

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
  { id: "closed", name: "Inchis" }
];

const products = [
  { id: "biblical-courses", name: "Cursuri biblice" },
  { id: "health-prayer", name: "Rugaciune sanatate" },
  { id: "meeting", name: "Intalnire" },
  { id: "consultation", name: "Consultatie" }
];

const defaultLeads = [
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

const state = {
  leads: loadLeads(),
  selectedLeadId: null,
  modalRequiresFollowup: false,
  activeFilter: "all",
  managerFilter: "all",
  search: "",
  view: "week",
  cursorDate: startOfDay(new Date())
};

const leadList = document.querySelector("#leadList");
const leadCount = document.querySelector("#leadCount");
const leadSearch = document.querySelector("#leadSearch");
const managerFilter = document.querySelector("#managerFilter");
const filterButtons = document.querySelectorAll(".chip");
const calendarGrid = document.querySelector("#calendarGrid");
const calendarTitle = document.querySelector("#calendarTitle");
const archiveCount = document.querySelector("#archiveCount");
const archiveTable = document.querySelector("#archiveTable");
const statsCards = document.querySelector("#statsCards");
const managerStatsTable = document.querySelector("#managerStatsTable");
const stageStatsTable = document.querySelector("#stageStatsTable");
const productStatsTable = document.querySelector("#productStatsTable");
const segmentedButtons = document.querySelectorAll(".segmented button");
const clientDialog = document.querySelector("#clientDialog");
const clientForm = document.querySelector("#clientForm");
const modalAvatar = document.querySelector("#modalAvatar");
const modalPlatform = document.querySelector("#modalPlatform");
const modalName = document.querySelector("#modalName");
const modalMetaLink = document.querySelector("#modalMetaLink");
const modalStatus = document.querySelector("#modalStatus");
const modalManager = document.querySelector("#modalManager");
const modalPriority = document.querySelector("#modalPriority");
const modalFollowDate = document.querySelector("#modalFollowDate");
const modalStage = document.querySelector("#modalStage");
const modalTags = document.querySelector("#modalTags");
const modalPhone = document.querySelector("#modalPhone");
const modalNotes = document.querySelector("#modalNotes");
const modalProducts = document.querySelector("#modalProducts");
const modalCreatedAt = document.querySelector("#modalCreatedAt");
const modalProcessedCount = document.querySelector("#modalProcessedCount");
const modalLastProcessedAt = document.querySelector("#modalLastProcessedAt");
const archiveBtn = document.querySelector("#archiveBtn");
const modalWarning = document.querySelector("#modalWarning");

document.querySelector("#prevRange").addEventListener("click", () => moveRange(-1));
document.querySelector("#nextRange").addEventListener("click", () => moveRange(1));
document.querySelector("#todayBtn").addEventListener("click", () => {
  state.cursorDate = startOfDay(new Date());
  render();
});

hydrateManagerSelects();

leadSearch.addEventListener("input", (event) => {
  state.search = event.target.value.trim().toLowerCase();
  renderLeads();
});

managerFilter.addEventListener("change", (event) => {
  state.managerFilter = event.target.value;
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    renderLeads();
  });
});

segmentedButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.view = button.dataset.view;
    segmentedButtons.forEach((item) => item.classList.toggle("active", item === button));
    renderCalendar();
  });
});

clientForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!canCloseCurrentLead()) return;
  saveSelectedLead();
  clientDialog.close();
});

document.querySelector("#openScheduleBtn").addEventListener("click", () => {
  const lead = getSelectedLead();
  if (!lead) return;
  modalFollowDate.value = modalFollowDate.value || addDaysKey(new Date(), 1);
  if (!canCloseCurrentLead()) return;
  saveSelectedLead();
  clientDialog.close();
});

clientDialog.addEventListener("cancel", (event) => {
  if (!canCloseCurrentLead()) {
    event.preventDefault();
    return;
  }

  saveOnRequiredDismiss();
});

document.querySelector(".close-btn").addEventListener("click", () => {
  if (canCloseCurrentLead()) {
    saveOnRequiredDismiss();
    clientDialog.close();
  }
});

archiveBtn.addEventListener("click", () => {
  const lead = getSelectedLead();
  if (!lead) return;

  lead.archived = true;
  lead.status = "closed";
  lead.unread = false;
  lead.stage = "closed";
  lead.followDate = "";
  lead.activity = [
    ...(lead.activity || []),
    { type: "archived", at: toIso(new Date()), managerId: lead.managerId }
  ];
  persist();
  clientDialog.close();
  render();
});

render();

function loadLeads() {
  const stored = localStorage.getItem("crm-leads");
  if (!stored) return defaultLeads;

  try {
    return JSON.parse(stored).map(normalizeLead);
  } catch {
    return defaultLeads;
  }
}

function normalizeLead(lead) {
  const now = toIso(new Date());
  const normalizedProducts = Array.isArray(lead.products)
    ? lead.products.map((item) => (typeof item === "string" ? { id: item, status: "proposed", proposedAt: lead.createdAt || now, managerId: lead.managerId || "unassigned" } : item))
    : [];

  return {
    ...lead,
    archived: lead.archived || false,
    unread: lead.unread ?? lead.status === "new",
    managerId: lead.managerId || "unassigned",
    priority: lead.priority || "normal",
    stage: lead.stage || inferStage(lead),
    createdAt: lead.createdAt || now,
    firstMessageAt: lead.firstMessageAt || lead.createdAt || now,
    processedCount: lead.processedCount || 0,
    lastProcessedAt: lead.lastProcessedAt || "",
    tagHistory: Array.isArray(lead.tagHistory) ? lead.tagHistory : [],
    products: normalizedProducts,
    activity: Array.isArray(lead.activity) ? lead.activity : []
  };
}

function hydrateManagerSelects() {
  const options = managers.map((manager) => `<option value="${manager.id}">${manager.name}</option>`).join("");
  managerFilter.insertAdjacentHTML("beforeend", options);
  modalManager.innerHTML = options;

  modalStage.innerHTML = stages.map((stage) => `<option value="${stage.id}">${stage.name}</option>`).join("");
  modalProducts.innerHTML = products
    .map((product) => `
      <label class="product-option">
        <input type="checkbox" value="${product.id}" />
        <span>${product.name}</span>
      </label>
    `)
    .join("");
}

function persist() {
  localStorage.setItem("crm-leads", JSON.stringify(state.leads));
}

function render() {
  renderLeads();
  renderCalendar();
  renderStats();
  renderArchive();
}

function renderLeads() {
  const leads = filteredLeads();
  leadCount.textContent = String(leads.length);
  leadList.innerHTML = "";

  leads.forEach((lead) => {
    const card = document.createElement("article");
    card.className = "lead-card";
    card.draggable = true;
    card.dataset.leadId = lead.id;
    card.innerHTML = `
      <img class="avatar" src="${lead.avatar}" alt="" />
      <div class="lead-main">
        <div class="lead-name-row">
          <span class="lead-name">${escapeHtml(lead.name)}</span>
          <span class="platform-pill platform-${lead.platform}">${platformLabel(lead.platform)}</span>
        </div>
        <p class="lead-details">${lead.followDate ? `Urmatorul mesaj: ${formatShortDate(parseKey(lead.followDate))}` : "Neprogramat"}</p>
        <div class="manager-line">
          <span class="manager-dot" style="--manager-color: ${managerFor(lead.managerId).color}"></span>
          <span>${escapeHtml(managerFor(lead.managerId).name)}</span>
          <span class="status-pill">Mesaj nou</span>
          ${lead.priority === "high" ? `<span class="status-pill">Prioritar</span>` : ""}
        </div>
        <div class="tag-row">
          <span class="tag-pill">${escapeHtml(stageFor(lead.stage).name)}</span>
          ${renderProductPills(lead.products)}
        </div>
        ${renderTags(lead.tags)}
        <div class="lead-actions">
          <button class="mini-btn primary" data-action="details">Detalii</button>
          <a class="mini-btn" href="${lead.metaUrl}" target="_blank" rel="noreferrer">Meta</a>
        </div>
      </div>
    `;

    card.addEventListener("dragstart", (event) => {
      card.classList.add("dragging");
      event.dataTransfer.setData("text/plain", lead.id);
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
    card.querySelector("[data-action='details']").addEventListener("click", () => openLead(lead.id, "inbox"));
    card.addEventListener("dblclick", () => openLead(lead.id, "inbox"));
    leadList.append(card);
  });

  if (!leads.length) {
    leadList.innerHTML = `<p class="empty-day">Nu exista lead-uri pentru filtrul ales.</p>`;
  }
}

function filteredLeads() {
  return state.leads.filter((lead) => {
    if (lead.archived) return false;
    if (!lead.unread) return false;
    const matchesPlatform = state.activeFilter === "all" || lead.platform === state.activeFilter;
    const matchesManager = state.managerFilter === "all" || lead.managerId === state.managerFilter;
    const haystack = [lead.name, lead.platform, lead.status, lead.phone, lead.notes, managerFor(lead.managerId).name, ...(lead.tags || [])]
      .join(" ")
      .toLowerCase();
    return matchesPlatform && matchesManager && haystack.includes(state.search);
  });
}

function renderCalendar() {
  const dates = getVisibleDates();
  calendarGrid.style.setProperty("--columns", dates.length);
  calendarGrid.innerHTML = "";
  calendarTitle.textContent = getCalendarTitle(dates);

  dates.forEach((date) => {
    const key = toDateKey(date);
    const day = document.createElement("section");
    day.className = `day-column ${isSameDay(date, new Date()) ? "today-ring" : ""}`;
    day.dataset.date = key;
    day.innerHTML = `
      <header class="day-head">
        <div class="day-name">${weekday(date)}</div>
        <div class="day-date">
          <span class="day-number">${date.getDate()}</span>
          <span>${monthName(date)}</span>
        </div>
      </header>
      <div class="day-events"></div>
    `;

    day.addEventListener("dragover", (event) => {
      event.preventDefault();
      day.classList.add("drop-target");
    });
    day.addEventListener("dragleave", () => day.classList.remove("drop-target"));
    day.addEventListener("drop", (event) => {
      event.preventDefault();
      day.classList.remove("drop-target");
      scheduleLead(event.dataTransfer.getData("text/plain"), key);
    });

    const events = state.leads.filter((lead) => {
      if (lead.archived) return false;
      const matchesManager = state.managerFilter === "all" || lead.managerId === state.managerFilter;
      return lead.followDate === key && matchesManager;
    });
    const eventsWrap = day.querySelector(".day-events");

    events.forEach((lead) => {
      const eventCard = document.createElement("article");
      eventCard.className = `event-card ${lead.platform} ${lead.priority === "high" ? "priority-high" : ""}`;
      eventCard.draggable = true;
      eventCard.dataset.leadId = lead.id;
      eventCard.innerHTML = `
        <strong>${escapeHtml(lead.name)}</strong>
        <span>${platformLabel(lead.platform)} - ${statusLabel(lead.status)}</span>
        ${lead.unread ? `<div class="event-badges"><span class="status-pill unread-pill">Mesaj nou</span></div>` : ""}
        <div class="manager-line">
          <span class="manager-dot" style="--manager-color: ${managerFor(lead.managerId).color}"></span>
          <span>${escapeHtml(managerFor(lead.managerId).name)}</span>
        </div>
        <div class="tag-row">
          <span class="tag-pill">${escapeHtml(stageFor(lead.stage).name)}</span>
          ${renderProductPills(lead.products)}
        </div>
        ${renderTags((lead.tags || []).slice(0, 3))}
        <div class="event-actions">
          <button class="mini-btn primary" data-action="details">Detalii</button>
          <a class="mini-btn" href="${lead.metaUrl}" target="_blank" rel="noreferrer">Meta</a>
          <button class="mini-btn" data-action="incoming">Mesaj nou</button>
        </div>
      `;
      eventCard.addEventListener("dragstart", (event) => {
        eventCard.classList.add("dragging");
        event.dataTransfer.setData("text/plain", lead.id);
      });
      eventCard.addEventListener("dragend", () => eventCard.classList.remove("dragging"));
      eventCard.querySelector("[data-action='details']").addEventListener("click", () => openLead(lead.id, "calendar"));
      eventCard.querySelector("[data-action='incoming']").addEventListener("click", () => markIncomingMessage(lead.id));
      eventsWrap.append(eventCard);
    });

    if (!events.length) {
      eventsWrap.innerHTML = `<p class="empty-day">Liber pentru follow-up</p>`;
    }

    calendarGrid.append(day);
  });
}

function renderArchive() {
  const archivedLeads = state.leads.filter((lead) => lead.archived);
  archiveCount.textContent = String(archivedLeads.length);
  archiveTable.innerHTML = "";

  if (!archivedLeads.length) {
    archiveTable.innerHTML = `<tr><td class="archive-empty" colspan="6">Nu exista clienti arhivati.</td></tr>`;
    return;
  }

  archivedLeads.forEach((lead) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <div class="archive-client">
          <img src="${lead.avatar}" alt="" />
          <span>${escapeHtml(lead.name)}</span>
        </div>
      </td>
      <td><span class="platform-pill platform-${lead.platform}">${platformLabel(lead.platform)}</span></td>
      <td>
        <span class="manager-line">
          <span class="manager-dot" style="--manager-color: ${managerFor(lead.managerId).color}"></span>
          <span>${escapeHtml(managerFor(lead.managerId).name)}</span>
        </span>
      </td>
      <td><div class="tag-row"><span class="tag-pill">${escapeHtml(stageFor(lead.stage).name)}</span>${renderProductPills(lead.products)}</div>${renderTags(lead.tags || []) || ""}</td>
      <td>${statusLabel(lead.status)}</td>
      <td>
        <button class="mini-btn primary" data-action="restore">Reactiveaza</button>
      </td>
    `;
    row.querySelector("[data-action='restore']").addEventListener("click", () => restoreLead(lead.id));
    archiveTable.append(row);
  });
}

function renderStats() {
  const total = state.leads.length;
  const unread = state.leads.filter((lead) => lead.unread && !lead.archived).length;
  const archived = state.leads.filter((lead) => lead.archived).length;
  const processed = state.leads.reduce((sum, lead) => sum + (lead.processedCount || 0), 0);
  const averageFollowup = averageFollowupDays();

  statsCards.innerHTML = [
    ["Lead-uri total", total],
    ["Mesaje necitite", unread],
    ["Prelucrari total", processed],
    ["Arhivate", archived],
    ["Timp mediu follow-up", `${averageFollowup} zile`]
  ]
    .map(([label, value]) => `
      <article class="stat-card">
        <span>${label}</span>
        <strong>${value}</strong>
      </article>
    `)
    .join("");

  managerStatsTable.innerHTML = managers
    .map((manager) => {
      const leads = state.leads.filter((lead) => lead.managerId === manager.id);
      return `
        <tr>
          <td>
            <span class="manager-line">
              <span class="manager-dot" style="--manager-color: ${manager.color}"></span>
              <span>${manager.name}</span>
            </span>
          </td>
          <td>${leads.length}</td>
          <td>${leads.reduce((sum, lead) => sum + (lead.processedCount || 0), 0)}</td>
          <td>${leads.filter((lead) => lead.unread && !lead.archived).length}</td>
          <td>${leads.filter((lead) => lead.archived).length}</td>
        </tr>
      `;
    })
    .join("");

  stageStatsTable.innerHTML = stages
    .map((stage) => {
      const leads = state.leads.filter((lead) => lead.stage === stage.id);
      return `
        <tr>
          <td>${stage.name}</td>
          <td>${leads.length}</td>
          <td>${leads.reduce((sum, lead) => sum + (lead.processedCount || 0), 0)}</td>
        </tr>
      `;
    })
    .join("");

  productStatsTable.innerHTML = products
    .map((product) => {
      const proposed = state.leads.flatMap((lead) => lead.products || []).filter((item) => item.id === product.id);
      return `
        <tr>
          <td>${product.name}</td>
          <td>${proposed.length}</td>
          <td>${proposed.filter((item) => item.status === "accepted").length}</td>
        </tr>
      `;
    })
    .join("");
}

function restoreLead(id) {
  const lead = state.leads.find((item) => item.id === id);
  if (!lead) return;

  lead.archived = false;
  lead.status = "new";
  lead.unread = true;
  lead.stage = "new";
  lead.activity = [
    ...(lead.activity || []),
    { type: "restored", at: toIso(new Date()), managerId: lead.managerId }
  ];
  persist();
  render();
}

function getVisibleDates() {
  if (state.view === "day") return [state.cursorDate];
  if (state.view === "month") {
    return Array.from({ length: 30 }, (_, index) => addDays(state.cursorDate, index));
  }
  return Array.from({ length: 7 }, (_, index) => addDays(state.cursorDate, index));
}

function getCalendarTitle(dates) {
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (state.view === "day") return formatLongDate(first);
  return `${formatShortDate(first)} - ${formatShortDate(last)}`;
}

function moveRange(direction) {
  const step = state.view === "day" ? 1 : state.view === "week" ? 7 : 30;
  state.cursorDate = addDays(state.cursorDate, direction * step);
  renderCalendar();
}

function openLead(id, source = "direct") {
  const lead = state.leads.find((item) => item.id === id);
  if (!lead) return;

  state.selectedLeadId = id;
  state.modalRequiresFollowup = source === "inbox" && lead.unread;
  hideModalWarning();
  modalAvatar.src = lead.avatar;
  modalPlatform.textContent = platformLabel(lead.platform);
  modalName.textContent = lead.name;
  modalMetaLink.href = lead.metaUrl;
  modalStatus.value = lead.status;
  modalManager.value = lead.managerId || "unassigned";
  modalPriority.value = lead.priority || "normal";
  modalFollowDate.value = lead.followDate || "";
  modalStage.value = lead.stage || "new";
  modalTags.value = (lead.tags || []).join(", ");
  modalPhone.value = lead.phone || "";
  modalNotes.value = lead.notes || "";
  modalCreatedAt.textContent = `Creat: ${formatDateTime(lead.createdAt)}`;
  modalProcessedCount.textContent = `Prelucrari: ${lead.processedCount || 0}`;
  modalLastProcessedAt.textContent = `Ultima prelucrare: ${lead.lastProcessedAt ? formatDateTime(lead.lastProcessedAt) : "-"}`;
  setModalProducts(lead.products || []);
  clientDialog.showModal();
}

function getSelectedLead() {
  return state.leads.find((lead) => lead.id === state.selectedLeadId);
}

function saveSelectedLead() {
  const lead = getSelectedLead();
  if (!lead) return;

  const previousStage = lead.stage || "new";
  const previousProducts = new Set((lead.products || []).map((item) => item.id));
  const now = toIso(new Date());

  lead.status = modalFollowDate.value ? "scheduled" : modalStatus.value;
  lead.unread = false;
  lead.managerId = modalManager.value;
  lead.priority = modalPriority.value;
  lead.followDate = modalFollowDate.value;
  lead.stage = modalStage.value;
  lead.tags = modalTags.value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  lead.products = getSelectedProducts().map((productId) => {
    const existing = (lead.products || []).find((item) => item.id === productId);
    return existing || { id: productId, status: "proposed", proposedAt: now, managerId: lead.managerId };
  });
  lead.phone = modalPhone.value.trim();
  lead.notes = modalNotes.value.trim();
  lead.processedCount = (lead.processedCount || 0) + 1;
  lead.lastProcessedAt = now;

  if (previousStage !== lead.stage) {
    lead.tagHistory = [
      ...(lead.tagHistory || []),
      { from: previousStage, to: lead.stage, changedAt: now, managerId: lead.managerId }
    ];
  }

  const newProducts = lead.products.filter((item) => !previousProducts.has(item.id)).map((item) => item.id);
  lead.activity = [
    ...(lead.activity || []),
    {
      type: "processed",
      at: now,
      managerId: lead.managerId,
      stage: lead.stage,
      followDate: lead.followDate,
      products: newProducts
    }
  ];

  persist();
  render();
}

function canCloseCurrentLead() {
  if (!state.modalRequiresFollowup) return true;
  if (isTodayOrFutureDateKey(modalFollowDate.value)) return true;

  showModalWarning("Alege o data de follow-up pentru azi sau viitor. Un mesaj deschis nu poate ramane in necitite.");
  return false;
}

function showModalWarning(message) {
  modalWarning.textContent = message;
  modalWarning.hidden = false;
  modalFollowDate.focus();
}

function hideModalWarning() {
  modalWarning.textContent = "";
  modalWarning.hidden = true;
}

function saveOnRequiredDismiss() {
  if (state.modalRequiresFollowup && isTodayOrFutureDateKey(modalFollowDate.value)) {
    saveSelectedLead();
  }
}

function scheduleLead(id, dateKey) {
  const lead = state.leads.find((item) => item.id === id);
  if (!lead) return;
  if (!isTodayOrFutureDateKey(dateKey)) return;
  lead.followDate = dateKey;
  lead.status = "scheduled";
  lead.unread = false;
  if (!lead.managerId) lead.managerId = "unassigned";
  persist();
  render();
}

function markIncomingMessage(id) {
  const lead = state.leads.find((item) => item.id === id);
  if (!lead || lead.archived) return;

  lead.unread = true;
  lead.activity = [
    ...(lead.activity || []),
    { type: "incoming_message", at: toIso(new Date()), managerId: lead.managerId }
  ];
  persist();
  render();
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

function inferStage(lead) {
  if (lead.status === "closed" || lead.archived) return "closed";
  if (lead.status === "scheduled") return "followup";
  if ((lead.tags || []).some((tag) => tag.toLowerCase().includes("accept"))) return "accepted";
  if ((lead.tags || []).some((tag) => tag.toLowerCase().includes("prop"))) return "proposal";
  return "new";
}

function setModalProducts(selectedProducts) {
  const selected = new Set(selectedProducts.map((item) => item.id));
  modalProducts.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.checked = selected.has(input.value);
  });
}

function getSelectedProducts() {
  return Array.from(modalProducts.querySelectorAll("input[type='checkbox']:checked")).map((input) => input.value);
}

function averageFollowupDays() {
  const values = state.leads
    .filter((lead) => lead.firstMessageAt && lead.followDate)
    .map((lead) => Math.max(0, Math.round((parseKey(lead.followDate).getTime() - new Date(lead.firstMessageAt).getTime()) / DAY_MS)));

  if (!values.length) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function renderTags(tags = []) {
  if (!tags.length) return "";
  return `<div class="tag-row">${tags.map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join("")}</div>`;
}

function renderProductPills(selectedProducts = []) {
  if (!selectedProducts.length) return "";
  return selectedProducts
    .slice(0, 2)
    .map((item) => `<span class="tag-pill">${escapeHtml(productFor(item.id).name)}</span>`)
    .join("");
}

function platformLabel(platform) {
  return platform === "facebook" ? "Facebook" : "Instagram";
}

function statusLabel(status) {
  return {
    new: "Nou",
    scheduled: "Programat",
    contacted: "Contactat",
    closed: "Inchis"
  }[status] || "Nou";
}

function toDateKey(date) {
  const safe = startOfDay(date);
  const year = safe.getFullYear();
  const month = String(safe.getMonth() + 1).padStart(2, "0");
  const day = String(safe.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
