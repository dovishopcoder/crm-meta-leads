"use client";

import { createClient } from "@supabase/supabase-js";
import { makeDefaultLeads, managers, products, stages } from "./crm-data.js";

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

  const [managerResult, stageResult, productResult, audienceResult] = await Promise.all([
    supabase.from("managers").select("id, name, email, role, color, active, created_at").order("created_at", { ascending: true }),
    supabase.from("stages").select("id, code, name, position, active, created_at").order("position", { ascending: true }),
    supabase.from("products").select("id, code, name, active, created_at").order("created_at", { ascending: true }),
    supabase
      .from("leads")
      .select("id, name, platform, customer_email, meta_email, meta_contact_id, phone, first_message_at, archived_at, managers(name), stages(code, name), lead_tags(tag), lead_products(products(code, name))")
      .order("created_at", { ascending: false })
  ]);

  if (managerResult.error) throw managerResult.error;
  if (stageResult.error) throw stageResult.error;
  if (productResult.error) throw productResult.error;
  if (audienceResult.error) throw audienceResult.error;

  return {
    managers: managerResult.data || [],
    stages: stageResult.data || [],
    products: productResult.data || [],
    audienceLeads: (audienceResult.data || []).map(toAudienceLead)
  };
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

export async function createStage({ code, name, position }) {
  if (!supabase) throw new Error("Supabase nu este configurat.");
  const { error } = await supabase.from("stages").insert({
    code,
    name,
    position: Number(position) || 0,
    active: true
  });
  if (error) throw error;
}

export async function createProduct({ code, name }) {
  if (!supabase) throw new Error("Supabase nu este configurat.");
  const { error } = await supabase.from("products").insert({
    code,
    name,
    active: true
  });
  if (error) throw error;
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
  if (!supabase) throw new Error("Supabase nu este configurat.");
  const { error } = await supabase.from("stages").update({ code, name, position: Number(position) || 0, active }).eq("id", id);
  if (error) throw error;
}

export async function updateProduct(id, { code, name, active }) {
  if (!supabase) throw new Error("Supabase nu este configurat.");
  const { error } = await supabase.from("products").update({ code, name, active }).eq("id", id);
  if (error) throw error;
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

export async function saveSupabaseLead(lead) {
  if (!supabase) return lead;

  const refs = await ensureReferenceData();
  const now = new Date().toISOString();
  const leadRow = {
    meta_contact_id: lead.metaContactId || lead.id,
    platform: lead.platform,
    name: lead.name,
    avatar_url: lead.avatar,
    meta_url: lead.metaUrl,
    email: lead.customerEmail || null,
    customer_email: lead.customerEmail || null,
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
    const { error } = await supabase.from("leads").update(leadRow).eq("id", lead.id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from("leads").upsert(leadRow, { onConflict: "meta_contact_id" }).select("id").single();
    if (error) throw error;
    savedId = data.id;
  }

  await saveLeadTags(savedId, lead.tags || []);
  await saveLeadProducts(savedId, lead.products || [], refs);
  return { ...lead, id: savedId, metaContactId: leadRow.meta_contact_id };
}

async function ensureReferenceData() {
  await supabase.from("stages").upsert(stages.map((stage, index) => ({
    code: stage.id,
    name: stage.name,
    position: index + 1,
    active: true
  })), { onConflict: "code" });

  await supabase.from("products").upsert(products.map((product) => ({
    code: product.id,
    name: product.name,
    active: true
  })), { onConflict: "code" });

  const { data: existingManagers, error: managerError } = await supabase.from("managers").select("id, name, color, role");
  if (managerError) throw managerError;

  const existingNames = new Set(existingManagers.map((manager) => manager.name.toLowerCase()));
  const missingManagers = managers
    .filter((manager) => manager.id !== "unassigned" && !existingNames.has(manager.name.toLowerCase()))
    .map((manager) => ({ name: manager.name, color: manager.color, role: "manager", active: true, email: `${manager.id}@example.com` }));

  if (missingManagers.length) {
    const { error } = await supabase.from("managers").insert(missingManagers);
    if (error) throw error;
  }

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
    email: row.email || "",
    customerEmail: row.customer_email || "",
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
