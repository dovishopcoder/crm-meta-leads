"use client";

import { createClient } from "@supabase/supabase-js";
import { hooks, makeDefaultLeads } from "./crm-data.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

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

  const { data, error } = await supabase
    .from("managers")
    .select("id, name, email, role, color, active")
    .eq("email", session.user.email)
    .maybeSingle();

  if (error) throw error;
  return data ? { ...data, code: managerNameToCode(data.name) } : null;
}

export async function loadAdminData() {
  if (!supabase) throw new Error("Supabase nu este configurat.");

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Sesiunea admin lipseste.");

  const response = await fetch("/api/admin/settings", {
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
  const data = await loadAdminData();
  return {
    managers: data.managers.map((manager) => ({
      id: manager.id,
      code: managerNameToCode(manager.name),
      name: manager.name,
      email: manager.email,
      role: manager.role,
      color: manager.color,
      active: manager.active
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
    }))
  };
}

export async function createManager({ name, email, password, role, color }) {
  if (!supabase) throw new Error("Supabase nu este configurat.");

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Sesiunea admin lipseste.");

  const response = await fetch("/api/admin/managers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ name, email, password, role, color })
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

export async function createStage({ code, name, position }) {
  return saveAdminSetting("POST", { type: "stage", code, name, position, active: true });
}

export async function createProduct({ code, name }) {
  return saveAdminSetting("POST", { type: "product", code, name, active: true });
}

export async function createLeadStatus({ code, name, position }) {
  return saveAdminSetting("POST", { type: "status", code, name, position, active: true });
}

export async function createReligion({ code, name, position }) {
  return saveAdminSetting("POST", { type: "religion", code, name, position, active: true });
}

export async function createHook({ code, name, position }) {
  return saveAdminSetting("POST", { type: "hook", code, name, position, active: true });
}

export async function updateManager(id, { name, email, role, color, active }) {
  if (!supabase) throw new Error("Supabase nu este configurat.");
  const { error } = await supabase.from("managers").update({ name, email, role, color, active }).eq("id", id);
  if (error) throw error;
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

export async function updateProduct(id, { code, name, active }) {
  return saveAdminSetting("PATCH", { id, type: "product", code, name, active });
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

export async function deleteAdminSetting(type, id) {
  return saveAdminSetting("DELETE", { id, type });
}

async function saveAdminSetting(method, body) {
  if (!supabase) throw new Error("Supabase nu este configurat.");

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Sesiunea admin lipseste.");

  const response = await fetch("/api/admin/settings", {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Nu s-a putut salva setarea.");
  return payload.data;
}

export async function loadSupabaseLeads() {
  if (!supabase) throw new Error("Supabase nu este configurat.");

  const refs = await ensureReferenceData();
  const { data, error } = await supabase
    .from("leads")
    .select("*, lead_tags(tag), lead_products(status, proposed_at, product_id, products(code, name))")
    .order("created_at", { ascending: true });

  if (error) throw error;

  if (!data.length) {
    await seedDemoLeads(refs);
    return loadSupabaseLeads();
  }

  return data.map((lead) => fromSupabaseLead(lead, refs));
}

export async function saveSupabaseLead(lead, options = {}) {
  if (!supabase) return lead;

  const refs = await ensureReferenceData();
  const now = new Date().toISOString();
  const leadRow = {
    meta_contact_id: lead.metaContactId || lead.id,
    platform: lead.platform,
    name: lead.name,
    avatar_url: lead.avatar,
    meta_url: lead.metaUrl,
    meta_url_verified: Boolean(lead.metaUrlVerified),
    email: lead.customerEmail || null,
    customer_email: lead.customerEmail || null,
    hook: lead.hook || null,
    phone: lead.phone || null,
    notes: lead.notes || null,
    status: lead.status,
    priority: lead.priority,
    unread: lead.unread,
    manager_id: refs.managerCodeToUuid[lead.managerId] || null,
    stage_id: refs.stageCodeToUuid[lead.stage] || null,
    follow_up_at: lead.followDate || null,
    first_message_at: lead.firstMessageAt || now,
    last_message_at: lead.lastMessageAt || lead.firstMessageAt || now,
    last_processed_at: lead.lastProcessedAt || null,
    processed_count: lead.processedCount || 0,
    archived_at: lead.archived ? lead.archivedAt || now : null,
    updated_at: now
  };

  let savedId = lead.id;

  if (isUuid(lead.id)) {
    const { error } = await saveLeadRowWithHookFallback(() => supabase.from("leads").update(leadRow).eq("id", lead.id), leadRow);
    if (error) throw error;
  } else {
    const existingByUrl = await findExistingLeadByMetaUrl(leadRow.meta_url);
    if (existingByUrl?.id) {
      if (options.rejectDuplicateMetaUrl) {
        throw new Error("Acest lead exista deja in CRM. Nu poti crea acelasi lead de doua ori.");
      }
      const { error } = await saveLeadRowWithHookFallback(() => supabase.from("leads").update({
        ...leadRow,
        first_message_at: existingByUrl.first_message_at || leadRow.first_message_at
      }).eq("id", existingByUrl.id), leadRow);
      if (error) throw error;
      savedId = existingByUrl.id;
    } else {
      const { data, error } = await saveLeadRowWithHookFallback(() => supabase.from("leads").upsert(leadRow, { onConflict: "meta_contact_id" }).select("id").single(), leadRow);
      if (error) throw error;
      savedId = data.id;
    }
  }

  await saveLeadTags(savedId, lead.tags || []);
  await saveLeadProducts(savedId, lead.products || [], refs);
  return { ...lead, id: savedId, metaContactId: leadRow.meta_contact_id };
}

async function findExistingLeadByMetaUrl(metaUrl) {
  if (!metaUrl) return null;
  const { data, error } = await supabase
    .from("leads")
    .select("id, first_message_at")
    .eq("meta_url", metaUrl)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
}

async function saveLeadRowWithHookFallback(action, leadRow) {
  const result = await action();
  if (!result.error || !isMissingHookColumnError(result.error)) return result;
  delete leadRow.hook;
  return action();
}

async function ensureReferenceData() {
  const [{ data: stageRows }, { data: productRows }, { data: managerRows }] = await Promise.all([
    supabase.from("stages").select("id, code, name"),
    supabase.from("products").select("id, code, name"),
    supabase.from("managers").select("id, name, color")
  ]);

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
    managerUuidToCode
  };
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

function isMissingHookColumnError(error) {
  return error?.code === "PGRST204" && /hook/i.test(error?.message || "");
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
    name: row.name,
    platform: row.platform,
    avatar: row.avatar_url || "",
    metaUrl: row.meta_url || "#",
    metaUrlVerified: Boolean(row.meta_url_verified),
    email: row.email || "",
    customerEmail: row.customer_email || "",
    hook: row.hook || "",
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
    tagHistory: [],
    products: (row.lead_products || []).map((item) => ({
      id: item.products?.code || refs.productUuidToCode[item.product_id],
      status: item.status,
      proposedAt: item.proposed_at,
      managerId: refs.managerUuidToCode[row.manager_id] || "unassigned"
    })).filter((item) => item.id),
    activity: [],
    managerId: refs.managerUuidToCode[row.manager_id] || "unassigned",
    priority: row.priority,
    tags: (row.lead_tags || []).map((tag) => tag.tag),
    phone: row.phone || "",
    notes: row.notes || "",
    followDate: row.follow_up_at || ""
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
