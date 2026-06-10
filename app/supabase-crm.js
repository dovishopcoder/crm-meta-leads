"use client";

import { createClient } from "@supabase/supabase-js";
import { currentInterests, hooks, makeDefaultLeads, needCategories } from "./crm-data.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ACTIVE_ORGANIZATION_KEY = "crm-active-organization-id";

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export function getActiveOrganizationId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ACTIVE_ORGANIZATION_KEY) || "";
}

export function setActiveOrganizationId(organizationId) {
  if (typeof window === "undefined") return;
  if (organizationId) {
    window.localStorage.setItem(ACTIVE_ORGANIZATION_KEY, organizationId);
  } else {
    window.localStorage.removeItem(ACTIVE_ORGANIZATION_KEY);
  }
}

export async function getCurrentSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signInWithEmail(email, password) {
  if (!supabase) throw new Error("Supabase nu este configurat.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function loadCurrentManager() {
  const session = await getCurrentSession();
  if (!session?.user?.email) return null;

  let { data, error } = await supabase
    .from("managers")
    .select("id, name, email, role, color, active, organization_id, organizations(id, name, slug)")
    .eq("email", session.user.email)
    .maybeSingle();

  if (error && isMissingLeadColumnError(error, "organization_id")) {
    const fallback = await supabase
      .from("managers")
      .select("id, name, email, role, color, active")
      .eq("email", session.user.email)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  return data ? {
    ...data,
    code: managerNameToCode(data.name),
    organizationId: data.organization_id || data.organizations?.id || "",
    organizationName: data.organizations?.name || ""
  } : null;
}

export async function loadAdminData(organizationId = getActiveOrganizationId()) {
  if (!supabase) throw new Error("Supabase nu este configurat.");

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Sesiunea admin lipseste.");

  const url = organizationId ? `/api/admin/settings?organizationId=${encodeURIComponent(organizationId)}` : "/api/admin/settings";
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Nu s-au putut incarca setarile.");
  return payload;
}

export async function loadProjectChecklistTasks() {
  if (!supabase) throw new Error("Supabase nu este configurat.");

  const { data, error } = await supabase
    .from("project_checklist_tasks")
    .select("id, section, title, done, created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createProjectChecklistTask({ section, title }) {
  if (!supabase) throw new Error("Supabase nu este configurat.");

  const { data, error } = await supabase
    .from("project_checklist_tasks")
    .insert({ section, title, done: false })
    .select("id, section, title, done, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function updateProjectChecklistTask(id, values) {
  if (!supabase) throw new Error("Supabase nu este configurat.");

  const { data, error } = await supabase
    .from("project_checklist_tasks")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, section, title, done, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProjectChecklistTask(id) {
  if (!supabase) throw new Error("Supabase nu este configurat.");
  const { error } = await supabase.from("project_checklist_tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function loadCrmConfig() {
  const data = await loadAdminData(getActiveOrganizationId());
  return {
    organization: data.organization || null,
    organizations: data.organizations || [],
    globalAdmin: Boolean(data.globalAdmin),
    managers: data.managers.map((manager) => ({
      id: manager.id,
      code: managerNameToCode(manager.name),
      name: manager.name,
      email: manager.email,
      role: manager.role,
      color: manager.color,
      active: manager.active,
      organizationId: manager.organization_id || ""
    })),
    stages: data.stages.map((stage) => ({
      id: stage.code,
      uuid: stage.id,
      name: stage.name,
      position: stage.position,
      active: stage.active
    })),
    products: data.products.map((product) => ({
      id: product.code,
      uuid: product.id,
      name: product.name,
      position: product.position,
      active: product.active
    })),
    statuses: data.statuses.map((status) => ({
      id: status.code,
      uuid: status.id,
      name: status.name,
      position: status.position,
      active: status.active
    })),
    religions: data.religions.map((religion) => ({
      id: religion.code,
      uuid: religion.id,
      name: religion.name,
      position: religion.position,
      active: religion.active
    })),
    hooks: (data.hooks || hooks).map((hook) => ({
      id: hook.code || hook.id,
      uuid: hook.id,
      name: hook.name,
      position: hook.position,
      active: hook.active
    })),
    currentInterests: (data.currentInterests?.length ? data.currentInterests : currentInterests).map((interest) => ({
      id: interest.code || interest.id,
      uuid: interest.id,
      name: interest.name,
      position: interest.position,
      active: interest.active
    })),
    needCategories: (data.needCategories?.length ? data.needCategories : needCategories).map((category) => ({
      id: category.code || category.id,
      uuid: category.id,
      name: category.name,
      position: category.position,
      active: category.active
    }))
  };
}

export async function createManager({ name, email, password, role, color, organizationId }) {
  if (!supabase) throw new Error("Supabase nu este configurat.");

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Sesiunea admin lipseste.");

  const response = await fetch("/api/admin/managers", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ name, email, password, role, color, organizationId })
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Nu s-a putut adauga managerul.");
}

export async function deleteManager(id) {
  if (!supabase) throw new Error("Supabase nu este configurat.");

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Sesiunea admin lipseste.");

  const response = await fetch(`/api/admin/managers?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Nu s-a putut sterge managerul.");
  return payload;
}

export async function resetManagerPassword(managerId, password) {
  if (!supabase) throw new Error("Supabase nu este configurat.");

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Sesiunea admin lipseste.");

  const response = await fetch("/api/admin/managers", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ managerId, password })
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Nu s-a putut schimba parola.");
}

export async function createStage({ code, name }) {
  return saveAdminSetting("POST", { type: "stage", code, name, active: true });
}

export async function createProduct({ code, name }) {
  return saveAdminSetting("POST", { type: "product", code, name, active: true });
}

export async function createLeadStatus({ code, name }) {
  return saveAdminSetting("POST", { type: "status", code, name, active: true });
}

export async function createReligion({ code, name }) {
  return saveAdminSetting("POST", { type: "religion", code, name, active: true });
}

export async function createHook({ code, name }) {
  return saveAdminSetting("POST", { type: "hook", code, name, active: true });
}

export async function createCurrentInterest({ code, name }) {
  return saveAdminSetting("POST", { type: "currentInterest", code, name, active: true });
}

export async function createNeedCategory({ code, name }) {
  return saveAdminSetting("POST", { type: "needCategory", code, name, active: true });
}

export async function updateManager(id, { name, email, role, color, active, organizationId }) {
  if (!supabase) throw new Error("Supabase nu este configurat.");
  const values = { name, email, role, color, active };
  if (organizationId) values.organization_id = organizationId;
  const { error } = await supabase.from("managers").update(values).eq("id", id);
  if (error) throw error;
}

export async function createOrganization({ name, slug, metaPageId, manychatPageId }) {
  return saveAdminSetting("POST", { type: "organization", name, slug, metaPageId, manychatPageId, active: true });
}

export async function updateOrganization(id, { name, slug, metaPageId, manychatPageId, active }) {
  return saveAdminSetting("PATCH", { id, type: "organization", name, slug, metaPageId, manychatPageId, active });
}

export async function countActiveLeadsForManager(managerId) {
  if (!supabase) throw new Error("Supabase nu este configurat.");
  const { count, error } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("manager_id", managerId)
    .is("archived_at", null);

  if (error) throw error;
  return count || 0;
}

export async function transferActiveLeads(fromManagerId, toManagerId) {
  if (!supabase) throw new Error("Supabase nu este configurat.");
  const { error } = await supabase
    .from("leads")
    .update({ manager_id: toManagerId, updated_at: new Date().toISOString() })
    .eq("manager_id", fromManagerId)
    .is("archived_at", null);

  if (error) throw error;
}

export async function updateStage(id, { code, name, position, active }) {
  return saveAdminSetting("PATCH", { id, type: "stage", code, name, position, active });
}

export async function updateProduct(id, { code, name, position, active }) {
  return saveAdminSetting("PATCH", { id, type: "product", code, name, position, active });
}

export async function updateLeadStatus(id, { code, name, position, active }) {
  return saveAdminSetting("PATCH", { id, type: "status", code, name, position, active });
}

export async function updateReligion(id, { code, name, position, active }) {
  return saveAdminSetting("PATCH", { id, type: "religion", code, name, position, active });
}

export async function updateHook(id, { code, name, position, active }) {
  return saveAdminSetting("PATCH", { id, type: "hook", code, name, position, active });
}

export async function updateCurrentInterest(id, { code, name, position, active }) {
  return saveAdminSetting("PATCH", { id, type: "currentInterest", code, name, position, active });
}

export async function updateNeedCategory(id, { code, name, position, active }) {
  return saveAdminSetting("PATCH", { id, type: "needCategory", code, name, position, active });
}

export async function deleteAdminSetting(type, id) {
  return saveAdminSetting("DELETE", { id, type });
}

export async function reorderAdminSettings(type, rows) {
  return saveAdminSetting("PATCH", {
    type,
    order: rows.map((row, index) => ({ id: row.id, position: index + 1 }))
  });
}

async function saveAdminSetting(method, body) {
  if (!supabase) throw new Error("Supabase nu este configurat.");

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Sesiunea admin lipseste.");

  const selectedOrganizationId = getActiveOrganizationId();
  const response = await fetch("/api/admin/settings", {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(selectedOrganizationId && !body.organizationId && body.type !== "organization"
      ? { ...body, organizationId: selectedOrganizationId }
      : body)
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Nu s-a putut salva setarea.");
  return payload.data;
}

export async function loadSupabaseLeads(organizationOverride = getActiveOrganizationId()) {
  if (!supabase) throw new Error("Supabase nu este configurat.");

  const refs = await ensureReferenceData(organizationOverride);
  const organizationId = refs.organizationId;
  const applyOrganizationFilter = (query) => (organizationId ? query.eq("organization_id", organizationId) : query);
  let { data, error } = await applyOrganizationFilter(supabase
    .from("leads")
    .select("*, lead_tags(tag), lead_products(status, proposed_at, manager_id, product_id, products(code, name)), lead_stage_history(from_stage_id, to_stage_id, manager_id, changed_at), lead_interest_history(interest_code, changed_at, manager_id), lead_need_categories(category_code, selected_at, manager_id), lead_need_category_history(category_code, action, changed_at, manager_id), lead_comments(comment, manager_id, created_at), lead_messages(id, direction, body, manager_id, external_id, status, error, sent_at, created_at), lead_activity(type, payload, manager_id, created_at)")
    .order("created_at", { ascending: true }));

  if (error && isMissingLeadColumnError(error, "organization_id")) {
    const fallback = await supabase
      .from("leads")
      .select("*, lead_tags(tag), lead_products(status, proposed_at, manager_id, product_id, products(code, name)), lead_stage_history(from_stage_id, to_stage_id, manager_id, changed_at), lead_interest_history(interest_code, changed_at, manager_id), lead_need_categories(category_code, selected_at, manager_id), lead_need_category_history(category_code, action, changed_at, manager_id), lead_comments(comment, manager_id, created_at), lead_messages(id, direction, body, manager_id, external_id, status, error, sent_at, created_at), lead_activity(type, payload, manager_id, created_at)")
      .order("created_at", { ascending: true });
    data = fallback.data;
    error = fallback.error;
  }

  if (error && isMissingLeadMessagesError(error)) {
    const fallback = await supabase
      .from("leads")
      .select("*, lead_tags(tag), lead_products(status, proposed_at, manager_id, product_id, products(code, name)), lead_stage_history(from_stage_id, to_stage_id, manager_id, changed_at), lead_interest_history(interest_code, changed_at, manager_id), lead_need_categories(category_code, selected_at, manager_id), lead_need_category_history(category_code, action, changed_at, manager_id), lead_comments(comment, manager_id, created_at), lead_activity(type, payload, manager_id, created_at)")
      .order("created_at", { ascending: true });
    data = fallback.data;
    error = fallback.error;
  }

  if (error && isMissingNeedCategoryTableError(error)) {
    const fallback = await supabase
      .from("leads")
      .select("*, lead_tags(tag), lead_products(status, proposed_at, manager_id, product_id, products(code, name)), lead_stage_history(from_stage_id, to_stage_id, manager_id, changed_at), lead_interest_history(interest_code, changed_at, manager_id), lead_comments(comment, manager_id, created_at), lead_messages(id, direction, body, manager_id, external_id, status, error, sent_at, created_at), lead_activity(type, payload, manager_id, created_at)")
      .order("created_at", { ascending: true });
    data = fallback.data;
    error = fallback.error;
  }

  if (error && isMissingTableError(error)) {
    const fallback = await supabase
      .from("leads")
      .select("*, lead_tags(tag), lead_products(status, proposed_at, manager_id, product_id, products(code, name))")
      .order("created_at", { ascending: true });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;

  if (!data.length) {
    await seedDemoLeads(refs);
    return loadSupabaseLeads(organizationOverride);
  }

  return data.map((lead) => fromSupabaseLead(lead, refs));
}

export async function sendManyChatMessage(leadId, text, options = {}) {
  if (!supabase) throw new Error("Supabase nu este configurat.");

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Sesiunea lipseste.");

  const image = options.image || null;
  const headers = {
    Authorization: `Bearer ${accessToken}`
  };
  let body;

  if (image) {
    body = new FormData();
    body.append("leadId", leadId);
    body.append("text", text || "");
    body.append("image", image);
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({ leadId, text });
  }

  const response = await fetch("/api/manychat/send", {
    method: "POST",
    headers,
    body
  });

  const responseText = await response.text();
  const payload = parseJson(responseText);
  if (!payload) {
    const snippet = responseText.replace(/\s+/g, " ").trim().slice(0, 140);
    throw new Error(response.ok
      ? "Serverul a raspuns intr-un format invalid. Reincarca pagina si incearca din nou."
      : `Serverul nu a putut procesa trimiterea mesajului. Status ${response.status}${snippet ? `: ${snippet}` : ""}`);
  }
  if (!response.ok) throw new Error(payload.error || "Mesajul nu a putut fi trimis.");
  return payload.message;
}

export async function saveSupabaseLead(lead, options = {}) {
  if (!supabase) return lead;

  const refs = await ensureReferenceData(getActiveOrganizationId());
  const now = new Date().toISOString();
  const leadRow = {
    organization_id: refs.organizationId || null,
    meta_contact_id: lead.metaContactId || lead.id,
    manychat_id: lead.manyChatId || null,
    platform: lead.platform,
    name: lead.name,
    avatar_url: lead.avatar,
    meta_url: lead.metaUrl,
    meta_url_verified: Boolean(lead.metaUrlVerified),
    email: lead.customerEmail || null,
    customer_email: lead.customerEmail || null,
    hook: lead.hook || null,
    current_interest: lead.currentInterest || null,
    need_category: (lead.needCategories?.[0] || lead.needCategory || null),
    phone: lead.phone || null,
    notes: lead.notes || null,
    status: lead.status,
    priority: lead.priority,
    unread: lead.unread,
    manager_id: refs.managerCodeToUuid[lead.managerId] || null,
    stage_id: refs.stageCodeToUuid[lead.stage] || null,
    follow_up_at: lead.followDate || null,
    follow_up_time: lead.followTime || null,
    first_message_at: lead.firstMessageAt || now,
    last_message_at: lead.lastMessageAt || lead.firstMessageAt || now,
    last_processed_at: lead.lastProcessedAt || null,
    processed_count: lead.processedCount || 0,
    archived_at: lead.archived ? lead.archivedAt || now : null,
    updated_at: now
  };

  let savedId = lead.id;

  if (isUuid(lead.id)) {
    const { error } = await saveLeadRowWithColumnFallback(() => supabase.from("leads").update(leadRow).eq("id", lead.id), leadRow);
    if (error) throw error;
  } else {
    const existingByUrl = await findExistingLeadByMetaUrl(leadRow.meta_url);
    if (existingByUrl?.id) {
      if (options.rejectDuplicateMetaUrl) {
        throw new Error("Acest lead exista deja in CRM. Nu poti crea acelasi lead de doua ori.");
      }
      const { error } = await saveLeadRowWithColumnFallback(() => supabase.from("leads").update({
        ...leadRow,
        first_message_at: existingByUrl.first_message_at || leadRow.first_message_at
      }).eq("id", existingByUrl.id), leadRow);
      if (error) throw error;
      savedId = existingByUrl.id;
    } else {
      const { data, error } = await saveLeadRowWithColumnFallback(() => supabase.from("leads").upsert(leadRow, { onConflict: "meta_contact_id" }).select("id").single(), leadRow);
      if (error) throw error;
      savedId = data.id;
    }
  }

  await saveLeadTags(savedId, lead.tags || []);
  await saveLeadProducts(savedId, lead.products || [], refs);
  await saveLeadStageHistory(savedId, lead.tagHistory || [], refs);
  await saveLeadInterestHistory(savedId, lead.currentInterestHistory || [], refs);
  await saveLeadNeedCategories(savedId, lead.needCategories || (lead.needCategory ? [lead.needCategory] : []), refs, lead);
  await saveLeadNeedCategoryHistory(savedId, lead.needCategoryHistory || [], refs);
  await saveLeadComments(savedId, lead.comments || [], refs);
  await saveLeadActivity(savedId, lead.activity || [], refs);
  return { ...lead, id: savedId, metaContactId: leadRow.meta_contact_id };
}

async function findExistingLeadByMetaUrl(metaUrl) {
  if (!metaUrl) return null;
  const refs = await ensureReferenceData(getActiveOrganizationId());
  let query = supabase
    .from("leads")
    .select("id, first_message_at")
    .eq("meta_url", metaUrl)
    .order("created_at", { ascending: true })
    .limit(1);
  if (refs.organizationId) query = query.eq("organization_id", refs.organizationId);

  let { data, error } = await query;
  if (error && refs.organizationId && isMissingLeadColumnError(error, "organization_id")) {
    const fallback = await supabase
      .from("leads")
      .select("id, first_message_at")
      .eq("meta_url", metaUrl)
      .order("created_at", { ascending: true })
      .limit(1);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  return data?.[0] || null;
}

async function saveLeadRowWithColumnFallback(action, leadRow) {
  const optionalColumns = ["hook", "current_interest", "need_category", "follow_up_time", "manychat_id", "organization_id"];
  let result = await action();
  let changed = true;
  while (result.error && changed) {
    changed = false;
    for (const column of optionalColumns) {
      if (column in leadRow && isMissingLeadColumnError(result.error, column)) {
        delete leadRow[column];
        result = await action();
        changed = true;
        break;
      }
    }
  }
  return result;
}

async function ensureReferenceData(organizationOverride = "") {
  const currentManager = await loadCurrentManager();
  const organizationId = currentManager?.role === "admin" && organizationOverride ? organizationOverride : currentManager?.organizationId || "";
  const applyOrganizationFilter = (query) => (organizationId ? query.eq("organization_id", organizationId) : query);
  let [{ data: stageRows, error: stageError }, { data: productRows, error: productError }, { data: managerRows, error: managerError }] = await Promise.all([
    applyOrganizationFilter(supabase.from("stages").select("id, code, name, organization_id")),
    applyOrganizationFilter(supabase.from("products").select("id, code, name, organization_id")),
    applyOrganizationFilter(supabase.from("managers").select("id, name, color, organization_id"))
  ]);

  if ([stageError, productError, managerError].some((error) => error && isMissingLeadColumnError(error, "organization_id"))) {
    const fallback = await Promise.all([
      supabase.from("stages").select("id, code, name"),
      supabase.from("products").select("id, code, name"),
      supabase.from("managers").select("id, name, color")
    ]);
    stageRows = fallback[0].data || [];
    productRows = fallback[1].data || [];
    managerRows = fallback[2].data || [];
    stageError = fallback[0].error;
    productError = fallback[1].error;
    managerError = fallback[2].error;
  }

  for (const error of [stageError, productError, managerError]) {
    if (error) throw error;
  }

  if (organizationId && !stageRows?.length) {
    stageRows = await loadDefaultReferenceRows("stages");
  }

  if (organizationId && !productRows?.length) {
    productRows = await loadDefaultReferenceRows("products");
  }

  const managerCodeToUuid = { unassigned: null };
  const managerUuidToCode = {};
  managerRows.forEach((manager) => {
    const code = managerNameToCode(manager.name);
    managerCodeToUuid[code] = manager.id;
    managerUuidToCode[manager.id] = code;
  });

  return {
    stageCodeToUuid: Object.fromEntries(stageRows.map((stage) => [stage.code, stage.id])),
    stageUuidToCode: Object.fromEntries(stageRows.map((stage) => [stage.id, stage.code])),
    productCodeToUuid: Object.fromEntries(productRows.map((product) => [product.code, product.id])),
    productUuidToCode: Object.fromEntries(productRows.map((product) => [product.id, product.code])),
    managerCodeToUuid,
    managerUuidToCode,
    organizationId
  };
}

async function loadDefaultReferenceRows(table) {
  const { data: organization } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", "dovi-crm")
    .maybeSingle();
  if (!organization?.id) return [];

  const { data, error } = await supabase
    .from(table)
    .select("id, code, name, organization_id")
    .eq("organization_id", organization.id);
  if (error) return [];
  return data || [];
}

async function loadOptionalOptionRows(table, fallbackRows) {
  const result = await supabase
    .from(table)
    .select("id, code, name, position, active, created_at")
    .order("position", { ascending: true });

  if (!result.error) return result;
  if (isMissingTableError(result.error)) {
    return {
      data: fallbackRows.map((row, index) => ({
        id: row.id,
        code: row.id,
        name: row.name,
        position: index + 1,
        active: true,
        created_at: null
      })),
      error: null
    };
  }
  return result;
}

function isMissingTableError(error) {
  return error?.code === "42P01" || /schema cache|does not exist|Could not find the table/i.test(error?.message || "");
}

function isMissingLeadMessagesError(error) {
  return /lead_messages/i.test(error?.message || "");
}

function isMissingNeedCategoryTableError(error) {
  return /lead_need_categories|lead_need_category_history|need_categories/i.test(error?.message || "") || isMissingTableError(error);
}

function isMissingLeadColumnError(error, column) {
  return ["PGRST200", "PGRST204"].includes(error?.code) && new RegExp(`${column}|organizations|schema cache`, "i").test(error?.message || "");
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function seedDemoLeads(refs) {
  for (const lead of makeDefaultLeads()) {
    await saveSupabaseLead(lead, refs);
  }
}

function fromSupabaseLead(row, refs) {
  return {
    id: row.id,
    metaContactId: row.meta_contact_id,
    manyChatId: row.manychat_id || "",
    name: row.name,
    platform: row.platform,
    avatar: row.avatar_url || "",
    metaUrl: row.meta_url || "#",
    metaUrlVerified: Boolean(row.meta_url_verified),
    email: row.email || "",
    customerEmail: row.customer_email || "",
    hook: row.hook || "",
    currentInterest: row.current_interest || "",
    needCategory: row.need_category || "",
    needCategories: [...(row.lead_need_categories || [])]
      .sort((left, right) => new Date(left.selected_at || 0).getTime() - new Date(right.selected_at || 0).getTime())
      .map((item) => item.category_code)
      .filter(Boolean)
      .concat(row.need_category && !(row.lead_need_categories || []).some((item) => item.category_code === row.need_category) ? [row.need_category] : []),
    status: row.status,
    unread: row.unread,
    archived: Boolean(row.archived_at),
    archivedAt: row.archived_at || "",
    stage: refs.stageUuidToCode[row.stage_id] || "new",
    createdAt: row.created_at,
    firstMessageAt: row.first_message_at,
    lastMessageAt: row.last_message_at,
    processedCount: row.processed_count || 0,
    lastProcessedAt: row.last_processed_at || "",
    tagHistory: (row.lead_stage_history || []).map((entry) => ({
      from: refs.stageUuidToCode[entry.from_stage_id] || "",
      to: refs.stageUuidToCode[entry.to_stage_id] || "",
      changedAt: entry.changed_at,
      managerId: refs.managerUuidToCode[entry.manager_id] || "unassigned"
    })),
    currentInterestHistory: (row.lead_interest_history || []).map((entry) => ({
      interest: entry.interest_code,
      changedAt: entry.changed_at,
      managerId: refs.managerUuidToCode[entry.manager_id] || "unassigned"
    })),
    needCategoryHistory: (row.lead_need_category_history || []).map((entry) => ({
      category: entry.category_code,
      action: entry.action || "added",
      changedAt: entry.changed_at,
      managerId: refs.managerUuidToCode[entry.manager_id] || "unassigned"
    })),
    comments: (row.lead_comments || []).map((comment) => ({
      text: comment.comment,
      managerId: refs.managerUuidToCode[comment.manager_id] || "unassigned",
      createdAt: comment.created_at
    })),
    messages: (row.lead_messages || []).map((message) => ({
      id: message.id,
      direction: message.direction,
      body: message.body,
      managerId: refs.managerUuidToCode[message.manager_id] || "",
      externalId: message.external_id || "",
      status: message.status || "",
      error: message.error || "",
      sentAt: message.sent_at,
      createdAt: message.created_at
    })).sort((left, right) => new Date(left.sentAt || left.createdAt).getTime() - new Date(right.sentAt || right.createdAt).getTime()),
    products: (row.lead_products || []).map((item) => ({
      id: item.products?.code || refs.productUuidToCode[item.product_id],
      status: item.status,
      proposedAt: item.proposed_at,
      managerId: refs.managerUuidToCode[item.manager_id] || "unassigned"
    })).filter((item) => item.id),
    activity: (row.lead_activity || []).map((activity) => ({
      ...(activity.payload || {}),
      type: activity.type,
      at: activity.created_at,
      managerId: refs.managerUuidToCode[activity.manager_id] || activity.payload?.managerId || "unassigned",
      persisted: true
    })),
    managerId: refs.managerUuidToCode[row.manager_id] || "unassigned",
    priority: row.priority,
    tags: (row.lead_tags || []).map((tag) => tag.tag),
    phone: row.phone || "",
    notes: row.notes || "",
    followDate: row.follow_up_at || "",
    followTime: row.follow_up_time || ""
  };
}

function toAudienceLead(row) {
  return {
    id: row.id,
    name: row.name,
    platform: row.platform,
    customerEmail: row.customer_email || "",
    phone: row.phone || "",
    metaEmail: row.meta_email || "",
    metaContactId: row.meta_contact_id || "",
    firstMessageAt: row.first_message_at || "",
    archived: Boolean(row.archived_at),
    manager: row.managers?.name || "Neatribuit",
    stage: row.stages?.name || "Fara etapa",
    stageCode: row.stages?.code || "",
    tags: (row.lead_tags || []).map((tag) => tag.tag),
    products: (row.lead_products || []).map((item) => item.products?.name).filter(Boolean)
  };
}

async function saveLeadTags(leadId, tags) {
  await supabase.from("lead_tags").delete().eq("lead_id", leadId);
  if (!tags.length) return;
  const { error } = await supabase.from("lead_tags").insert(tags.map((tag) => ({ lead_id: leadId, tag })));
  if (error) throw error;
}

async function saveLeadProducts(leadId, selectedProducts, refs) {
  await supabase.from("lead_products").delete().eq("lead_id", leadId);
  if (!selectedProducts.length) return;

  const rows = selectedProducts
    .map((product) => ({
      lead_id: leadId,
      product_id: refs.productCodeToUuid[product.id],
      manager_id: refs.managerCodeToUuid[product.managerId] || null,
      status: product.status || "proposed",
      proposed_at: product.proposedAt || new Date().toISOString()
    }))
    .filter((row) => row.product_id);

  if (!rows.length) return;
  const { error } = await supabase.from("lead_products").insert(rows);
  if (error) throw error;
}

async function saveLeadNeedCategories(leadId, selectedCategories, refs, lead) {
  const deleteResult = await supabase.from("lead_need_categories").delete().eq("lead_id", leadId);
  if (deleteResult.error) {
    if (isMissingNeedCategoryTableError(deleteResult.error)) return;
    throw deleteResult.error;
  }

  const uniqueCategories = [...new Set((selectedCategories || []).filter(Boolean))];
  if (!uniqueCategories.length) return;

  const firstSelectedAtByCategory = new Map();
  [...(lead.needCategoryHistory || [])]
    .filter((entry) => entry.category && entry.action !== "removed")
    .sort((left, right) => new Date(left.changedAt || 0).getTime() - new Date(right.changedAt || 0).getTime())
    .forEach((entry) => {
      if (!firstSelectedAtByCategory.has(entry.category)) {
        firstSelectedAtByCategory.set(entry.category, entry.changedAt);
      }
    });

  const rows = uniqueCategories.map((category) => ({
    lead_id: leadId,
    category_code: category,
    manager_id: refs.managerCodeToUuid[lead.managerId] || null,
    selected_at: firstSelectedAtByCategory.get(category) || new Date().toISOString()
  }));

  const { error } = await supabase.from("lead_need_categories").insert(rows);
  if (error) {
    if (isMissingNeedCategoryTableError(error)) return;
    throw error;
  }
}

async function saveLeadStageHistory(leadId, history, refs) {
  const deleteResult = await supabase.from("lead_stage_history").delete().eq("lead_id", leadId);
  if (deleteResult.error) {
    if (isMissingTableError(deleteResult.error)) return;
    throw deleteResult.error;
  }

  const rows = history
    .filter((entry) => entry.to)
    .map((entry) => ({
      lead_id: leadId,
      from_stage_id: refs.stageCodeToUuid[entry.from] || null,
      to_stage_id: refs.stageCodeToUuid[entry.to] || null,
      manager_id: refs.managerCodeToUuid[entry.managerId] || null,
      changed_at: entry.changedAt || new Date().toISOString()
    }))
    .filter((row) => row.to_stage_id);

  if (!rows.length) return;
  const { error } = await supabase.from("lead_stage_history").insert(rows);
  if (error) {
    if (isMissingTableError(error)) return;
    throw error;
  }
}

async function saveLeadInterestHistory(leadId, history, refs) {
  const deleteResult = await supabase.from("lead_interest_history").delete().eq("lead_id", leadId);
  if (deleteResult.error) {
    if (isMissingTableError(deleteResult.error)) return;
    throw deleteResult.error;
  }

  const rows = history
    .filter((entry) => entry.interest)
    .map((entry) => ({
      lead_id: leadId,
      interest_code: entry.interest,
      manager_id: refs.managerCodeToUuid[entry.managerId] || null,
      changed_at: entry.changedAt || new Date().toISOString()
    }));

  if (!rows.length) return;
  const { error } = await supabase.from("lead_interest_history").insert(rows);
  if (error) {
    if (isMissingTableError(error)) return;
    throw error;
  }
}

async function saveLeadNeedCategoryHistory(leadId, history, refs) {
  const deleteResult = await supabase.from("lead_need_category_history").delete().eq("lead_id", leadId);
  if (deleteResult.error) {
    if (isMissingNeedCategoryTableError(deleteResult.error)) return;
    throw deleteResult.error;
  }

  const rows = history
    .filter((entry) => entry.category)
    .map((entry) => ({
      lead_id: leadId,
      category_code: entry.category,
      action: entry.action || "added",
      manager_id: refs.managerCodeToUuid[entry.managerId] || null,
      changed_at: entry.changedAt || new Date().toISOString()
    }));

  if (!rows.length) return;
  const { error } = await supabase.from("lead_need_category_history").insert(rows);
  if (error) {
    if (isMissingNeedCategoryTableError(error)) return;
    throw error;
  }
}

async function saveLeadComments(leadId, comments, refs) {
  const deleteResult = await supabase.from("lead_comments").delete().eq("lead_id", leadId);
  if (deleteResult.error) {
    if (isMissingTableError(deleteResult.error)) return;
    throw deleteResult.error;
  }

  const rows = comments
    .filter((comment) => comment.text)
    .map((comment) => ({
      lead_id: leadId,
      comment: comment.text,
      manager_id: refs.managerCodeToUuid[comment.managerId] || null,
      created_at: comment.createdAt || new Date().toISOString()
    }));

  if (!rows.length) return;
  const { error } = await supabase.from("lead_comments").insert(rows);
  if (error) {
    if (isMissingTableError(error)) return;
    throw error;
  }
}

async function saveLeadActivity(leadId, activity, refs) {
  const rows = activity
    .filter((entry) => entry.type && !entry.persisted)
    .map((entry) => ({
      lead_id: leadId,
      manager_id: refs.managerCodeToUuid[entry.managerId] || null,
      type: entry.type,
      payload: Object.fromEntries(Object.entries(entry).filter(([key]) => !["type", "at", "persisted"].includes(key))),
      created_at: entry.at || new Date().toISOString()
    }));

  if (!rows.length) return;
  const { error } = await supabase.from("lead_activity").insert(rows);
  if (error) {
    if (isMissingTableError(error)) return;
    throw error;
  }
}

function managerNameToCode(name) {
  const normalized = name.toLowerCase();
  if (normalized.includes("diana")) return "diana";
  if (normalized.includes("alex")) return "alex";
  if (normalized.includes("marina")) return "marina";
  return normalized.trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unassigned";
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
