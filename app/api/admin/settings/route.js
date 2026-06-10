import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TABLES = {
  stage: "stages",
  product: "products",
  status: "lead_statuses",
  religion: "religions",
  hook: "hook_options",
  currentInterest: "current_interests",
  needCategory: "need_categories"
};

const DEFAULT_STATUSES = [
  { code: "new", name: "Nou", position: 1, active: true },
  { code: "scheduled", name: "Programat", position: 2, active: true },
  { code: "contacted", name: "Contactat", position: 3, active: true },
  { code: "closed", name: "Inchis", position: 4, active: true }
];

const DEFAULT_RELIGIONS = [
  { code: "adventist", name: "Adventist", position: 1, active: true },
  { code: "ortodox", name: "Ortodox", position: 2, active: true },
  { code: "catolic", name: "Catolic", position: 3, active: true },
  { code: "alta", name: "Alta", position: 4, active: true }
];

const DEFAULT_HOOKS = [
  { code: "sanatate", name: "Sanatate", position: 1, active: true },
  { code: "familie", name: "Familie", position: 2, active: true },
  { code: "intrebari-teologice", name: "Intrebari teologice", position: 3, active: true },
  { code: "critice", name: "Critice", position: 4, active: true }
];

const DEFAULT_CURRENT_INTERESTS = [
  { code: "rugaciune", name: "Rugăciune", position: 1, active: true },
  { code: "bibletoday", name: "BibleToday", position: 2, active: true }
];

const DEFAULT_NEED_CATEGORIES = [
  { code: "familie", name: "Familie", position: 1, active: true },
  { code: "sanatate", name: "Sanatate", position: 2, active: true },
  { code: "copii", name: "Copii", position: 3, active: true },
  { code: "casatorie", name: "Casatorie", position: 4, active: true },
  { code: "dependente", name: "Dependente", position: 5, active: true },
  { code: "anxietate", name: "Anxietate", position: 6, active: true },
  { code: "depresie", name: "Depresie", position: 7, active: true },
  { code: "singuratate", name: "Singuratate", position: 8, active: true },
  { code: "financiar", name: "Financiar", position: 9, active: true },
  { code: "spiritual", name: "Spiritual", position: 10, active: true },
  { code: "pierdere", name: "Pierdere", position: 11, active: true },
  { code: "boala", name: "Boala", position: 12, active: true }
];

function serverSupabase() {
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase server env is missing.");
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

function publicSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase public env is missing.");
  return createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
}

export async function GET(request) {
  try {
    const supabase = serverSupabase();
    const manager = await requireManager(request, supabase);
    const globalAdmin = isGlobalAdmin(manager);
    const organizationId = getRequestedOrganizationId(request, manager, globalAdmin);
    const applyOrg = (query) => (organizationId ? query.eq("organization_id", organizationId) : query);

    const managerQuery = globalAdmin
      ? supabase.from("managers").select("id, name, email, role, color, active, created_at, organization_id, organizations(name, slug)").order("created_at", { ascending: true })
      : applyOrg(supabase.from("managers").select("id, name, email, role, color, active, created_at, organization_id, organizations(name, slug)").order("created_at", { ascending: true }));

    const [organizationResult, managerResult, stageResult, productResult, statusResult, religionResult, hookResult, currentInterestResult, needCategoryResult, audienceResult] = await Promise.all([
      loadOrganizations(supabase, manager, globalAdmin),
      loadScopedRows(managerQuery, () => supabase.from("managers").select("id, name, email, role, color, active, created_at").order("created_at", { ascending: true })),
      loadSettingRows(supabase, "stages", organizationId),
      loadProductRows(supabase, organizationId),
      loadOptionRows(supabase, "lead_statuses", DEFAULT_STATUSES, organizationId),
      loadOptionRows(supabase, "religions", DEFAULT_RELIGIONS, organizationId),
      loadOptionRows(supabase, "hook_options", DEFAULT_HOOKS, organizationId),
      loadOptionRows(supabase, "current_interests", DEFAULT_CURRENT_INTERESTS, organizationId),
      loadOptionRows(supabase, "need_categories", DEFAULT_NEED_CATEGORIES, organizationId),
      loadScopedRows(applyOrg(supabase
        .from("leads")
        .select("id, name, platform, customer_email, meta_email, meta_contact_id, phone, first_message_at, archived_at, organization_id, managers(name), stages(code, name), lead_tags(tag), lead_products(products(code, name))")
        .order("created_at", { ascending: false })), () => supabase
        .from("leads")
        .select("id, name, platform, customer_email, meta_email, meta_contact_id, phone, first_message_at, archived_at, managers(name), stages(code, name), lead_tags(tag), lead_products(products(code, name))")
        .order("created_at", { ascending: false }))
    ]);

    for (const result of [organizationResult, managerResult, stageResult, productResult, statusResult, religionResult, hookResult, currentInterestResult, needCategoryResult, audienceResult]) {
      if (result.error) throw result.error;
    }

    return NextResponse.json({
      organization: manager.organizations || null,
      organizations: organizationResult.data || [],
      globalAdmin,
      activeOrganizationId: organizationId,
      managers: managerResult.data || [],
      stages: stageResult.data || [],
      products: productResult.data || [],
      statuses: statusResult.data || [],
      religions: religionResult.data || [],
      hooks: hookResult.data || [],
      currentInterests: currentInterestResult.data || [],
      needCategories: needCategoryResult.data || [],
      audienceLeads: (audienceResult.data || []).map(toAudienceLead)
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Nu s-au putut incarca setarile." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = serverSupabase();
    const manager = await requireAdmin(request, supabase);
    const body = await request.json();
    const globalAdmin = isGlobalAdmin(manager);
    const organizationId = getBodyOrganizationId(body, manager, globalAdmin);
    const type = String(body.type || "").trim();
    if (type === "organization") {
      if (!isGlobalAdmin(manager)) return NextResponse.json({ error: "Doar adminul global poate crea organizatii." }, { status: 403 });
      const payload = buildOrganizationPayload(body);
      if (!payload.name || !payload.slug) return NextResponse.json({ error: "Completeaza numele si slug-ul organizatiei." }, { status: 400 });
      const { data, error } = await saveOrganizationWithTokenFallback(
        () => supabase.from("organizations").insert(payload).select("id, name, slug, meta_page_id, manychat_page_id, meta_page_access_token, active").single(),
        () => supabase.from("organizations").insert(payload).select("id, name, slug, meta_page_id, manychat_page_id, active").single(),
        payload
      );
      if (error) throw error;
      await cloneDefaultSettingsToOrganization(supabase, data.id, manager.organization_id);
      return NextResponse.json({ ok: true, data });
    }

    const table = TABLES[type];
    if (!table) return NextResponse.json({ error: "Tip setare invalid." }, { status: 400 });

    const payload = buildPayload(type, body);
    if (organizationId) payload.organization_id = organizationId;
    if (!payload.code || !payload.name) {
      return NextResponse.json({ error: "Completeaza codul si numele." }, { status: 400 });
    }
    if (payload.position === undefined) {
      payload.position = await nextPosition(supabase, table, organizationId);
    }

    let { data, error } = await supabase.from(table).insert(payload).select("*").single();
    if (error && isMissingOrganizationColumnError(error) && "organization_id" in payload) {
      delete payload.organization_id;
      const retry = await supabase.from(table).insert(payload).select("*").single();
      data = retry.data;
      error = retry.error;
    }
    if (error && isMissingPositionError(error) && "position" in payload) {
      delete payload.position;
      const retry = await supabase.from(table).insert(payload).select("*").single();
      data = retry.data;
      error = retry.error;
    }
    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Nu s-a putut salva setarea." }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const supabase = serverSupabase();
    const manager = await requireAdmin(request, supabase);
    const body = await request.json();
    const globalAdmin = isGlobalAdmin(manager);
    const organizationId = getBodyOrganizationId(body, manager, globalAdmin);
    const type = String(body.type || "").trim();
    if (type === "organization") {
      if (!isGlobalAdmin(manager)) return NextResponse.json({ error: "Doar adminul global poate modifica organizatii." }, { status: 403 });
      const id = String(body.id || "").trim();
      if (!id) return NextResponse.json({ error: "Organizatia lipseste." }, { status: 400 });
      const payload = buildOrganizationPayload(body);
      const { data, error } = await saveOrganizationWithTokenFallback(
        () => supabase.from("organizations").update(payload).eq("id", id).select("id, name, slug, meta_page_id, manychat_page_id, meta_page_access_token, active").single(),
        () => supabase.from("organizations").update(payload).eq("id", id).select("id, name, slug, meta_page_id, manychat_page_id, active").single(),
        payload
      );
      if (error) throw error;
      return NextResponse.json({ ok: true, data });
    }

    const table = TABLES[type];
    const id = String(body.id || "").trim();
    if (!table) return NextResponse.json({ error: "Setarea lipseste." }, { status: 400 });

    if (Array.isArray(body.order)) {
      await updateOrder(supabase, table, body.order, organizationId);
      return NextResponse.json({ ok: true });
    }

    if (!id) return NextResponse.json({ error: "Setarea lipseste." }, { status: 400 });

    const payload = buildPayload(type, body);
    if (!payload.code || !payload.name) {
      return NextResponse.json({ error: "Completeaza codul si numele." }, { status: 400 });
    }

    let updateQuery = supabase.from(table).update(payload).eq("id", id);
    if (organizationId) updateQuery = updateQuery.eq("organization_id", organizationId);
    let { data, error } = await updateQuery.select("*").single();
    if (error && isMissingOrganizationColumnError(error)) {
      const retry = await supabase.from(table).update(payload).eq("id", id).select("*").single();
      data = retry.data;
      error = retry.error;
    }
    if (error && isMissingPositionError(error) && "position" in payload) {
      delete payload.position;
      let retryQuery = supabase.from(table).update(payload).eq("id", id);
      if (organizationId && "organization_id" in payload) retryQuery = retryQuery.eq("organization_id", organizationId);
      const retry = await retryQuery.select("*").single();
      data = retry.data;
      error = retry.error;
    }
    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Nu s-a putut actualiza setarea." }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabase = serverSupabase();
    const manager = await requireAdmin(request, supabase);
    const body = await request.json();
    const globalAdmin = isGlobalAdmin(manager);
    const organizationId = getBodyOrganizationId(body, manager, globalAdmin);
    const type = String(body.type || "").trim();
    if (type === "organization") {
      if (!isGlobalAdmin(manager)) return NextResponse.json({ error: "Doar adminul global poate dezactiva organizatii." }, { status: 403 });
      const id = String(body.id || "").trim();
      if (!id || id === manager.organization_id) return NextResponse.json({ error: "Organizatia nu poate fi dezactivata." }, { status: 400 });
      const { error } = await supabase.from("organizations").update({ active: false, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    const table = TABLES[type];
    const id = String(body.id || "").trim();
    if (!table || !id) return NextResponse.json({ error: "Setarea lipseste." }, { status: 400 });

    let deleteQuery = supabase.from(table).delete().eq("id", id);
    if (organizationId) deleteQuery = deleteQuery.eq("organization_id", organizationId);
    let { error } = await deleteQuery;
    if (error && organizationId && isMissingOrganizationColumnError(error)) {
      const retry = await supabase.from(table).delete().eq("id", id);
      error = retry.error;
    }
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Nu s-a putut sterge setarea." }, { status: 500 });
  }
}

async function requireAdmin(request, supabase) {
  const manager = await requireManager(request, supabase);
  if (manager.role !== "admin") throw new Error("Doar adminul poate modifica setarile.");
  return manager;
}

async function requireManager(request, supabase) {
  const token = getBearerToken(request);
  if (!token) throw new Error("Sesiunea admin lipseste.");

  const authClient = publicSupabase();
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user?.email) throw new Error("Sesiunea admin nu este valida.");

  let { data: adminManager, error: adminError } = await supabase
    .from("managers")
    .select("id, email, role, active, organization_id, organizations(id, name, slug)")
    .eq("email", userData.user.email)
    .maybeSingle();

  if (adminError && isMissingOrganizationColumnError(adminError)) {
    const fallback = await supabase
      .from("managers")
      .select("id, role, active")
      .eq("email", userData.user.email)
      .maybeSingle();
    adminManager = fallback.data;
    adminError = fallback.error;
  }

  if (adminError) throw adminError;
  if (!adminManager?.active) throw new Error("Contul logat nu este manager activ.");
  return adminManager;
}

function buildPayload(type, body) {
  const payload = {
    code: String(body.code || "").trim(),
    name: String(body.name || "").trim(),
    active: body.active !== false
  };

  if (body.position !== undefined) {
    payload.position = Number(body.position) || 0;
  }

  return payload;
}

function buildOrganizationPayload(body) {
  const payload = {
    name: String(body.name || "").trim(),
    slug: String(body.slug || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    meta_page_id: String(body.metaPageId || body.meta_page_id || "").trim() || null,
    manychat_page_id: String(body.manychatPageId || body.manychat_page_id || "").trim() || null,
    active: body.active !== false,
    updated_at: new Date().toISOString()
  };
  const token = String(body.metaPageAccessToken || body.meta_page_access_token || "").trim();
  if (token) payload.meta_page_access_token = token;
  return payload;
}

async function saveOrganizationWithTokenFallback(action, fallbackAction, payload) {
  let result = await action();
  if (result.error && isMissingMetaTokenColumnError(result.error)) {
    delete payload.meta_page_access_token;
    result = await fallbackAction();
  }
  return result;
}

function getRequestedOrganizationId(request, manager, globalAdmin) {
  const requested = String(new URL(request.url).searchParams.get("organizationId") || "").trim();
  if (globalAdmin && requested) return requested;
  return manager.organization_id || "";
}

function getBodyOrganizationId(body, manager, globalAdmin) {
  const requested = String(body.organizationId || body.organization_id || "").trim();
  if (globalAdmin && requested) return requested;
  return manager.organization_id || "";
}

async function loadOrganizations(supabase, manager, globalAdmin) {
  const query = supabase
    .from("organizations")
    .select("id, name, slug, meta_page_id, manychat_page_id, meta_page_access_token, active, created_at")
    .order("created_at", { ascending: true });
  let result = globalAdmin || !manager.organization_id ? await query : await query.eq("id", manager.organization_id);
  if (isMissingMetaTokenColumnError(result.error)) {
    const fallbackQuery = supabase
      .from("organizations")
      .select("id, name, slug, meta_page_id, manychat_page_id, active, created_at")
      .order("created_at", { ascending: true });
    result = globalAdmin || !manager.organization_id ? await fallbackQuery : await fallbackQuery.eq("id", manager.organization_id);
  }
  if (!result.error) return result;
  if (isMissingOrganizationTableError(result.error)) return { data: [], error: null };
  return result;
}

async function cloneDefaultSettingsToOrganization(supabase, targetOrganizationId, sourceOrganizationId = "") {
  if (!targetOrganizationId) return;

  const sourceId = sourceOrganizationId || await findDefaultOrganizationId(supabase);
  if (!sourceId || sourceId === targetOrganizationId) return;

  for (const table of ["stages", "products", "lead_statuses", "religions", "hook_options", "current_interests", "need_categories"]) {
    await cloneTableRows(supabase, table, sourceId, targetOrganizationId);
  }
}

async function findDefaultOrganizationId(supabase) {
  const { data } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", "dovi-crm")
    .maybeSingle();
  return data?.id || "";
}

async function cloneTableRows(supabase, table, sourceOrganizationId, targetOrganizationId) {
  const existing = await supabase
    .from(table)
    .select("id")
    .eq("organization_id", targetOrganizationId)
    .limit(1);
  if (existing.error && isMissingOrganizationColumnError(existing.error)) return;
  if (existing.error || existing.data?.length) return;

  const source = await supabase
    .from(table)
    .select("code, name, position, active")
    .eq("organization_id", sourceOrganizationId)
    .order("position", { ascending: true });
  if (source.error || !source.data?.length) return;

  const rows = source.data.map((row) => ({
    code: row.code,
    name: row.name,
    position: row.position,
    active: row.active,
    organization_id: targetOrganizationId
  }));

  await supabase.from(table).insert(rows);
}

async function nextPosition(supabase, table, organizationId = "") {
  let query = supabase
    .from(table)
    .select("position")
    .order("position", { ascending: false })
    .limit(1);
  if (organizationId) query = query.eq("organization_id", organizationId);
  let result = await query;

  if (result.error && organizationId && isMissingOrganizationColumnError(result.error)) {
    result = await supabase
      .from(table)
      .select("position")
      .order("position", { ascending: false })
      .limit(1);
  }

  if (result.error) {
    if (isMissingPositionError(result.error)) return undefined;
    throw result.error;
  }
  return Number(result.data?.[0]?.position || 0) + 1;
}

async function updateOrder(supabase, table, order, organizationId = "") {
  for (const item of order) {
    const id = String(item.id || "").trim();
    if (!id) continue;
    let query = supabase
      .from(table)
      .update({ position: Number(item.position) || 0 })
      .eq("id", id);
    if (organizationId) query = query.eq("organization_id", organizationId);
    let { error } = await query;
    if (error && organizationId && isMissingOrganizationColumnError(error)) {
      const retry = await supabase
        .from(table)
        .update({ position: Number(item.position) || 0 })
        .eq("id", id);
      error = retry.error;
    }
    if (error) throw error;
  }
}

async function loadProductRows(supabase, organizationId = "") {
  const applyOrg = (query) => (organizationId ? query.eq("organization_id", organizationId) : query);
  let result = await applyOrg(supabase
    .from("products")
    .select("id, code, name, position, active, created_at, organization_id")
    .order("position", { ascending: true }));

  if (result.error && organizationId && isMissingOrganizationColumnError(result.error)) {
    result = await supabase
      .from("products")
      .select("id, code, name, position, active, created_at")
      .order("position", { ascending: true });
  }

  if (!result.error && (result.data?.length || !organizationId)) return result;
  if (!result.error && organizationId && !result.data?.length) return loadDefaultSettingRows(supabase, "products");
  if (!isMissingPositionError(result.error)) return result;

  const fallback = await applyOrg(supabase
    .from("products")
    .select("id, code, name, active, created_at")
    .order("created_at", { ascending: true }));

  if (fallback.error) return fallback;
  return {
    data: (fallback.data || []).map((product, index) => ({ ...product, position: index + 1 })),
    error: null
  };
}

async function loadOptionRows(supabase, table, fallbackRows, organizationId = "") {
  const applyOrg = (query) => (organizationId ? query.eq("organization_id", organizationId) : query);
  let result = await applyOrg(supabase
    .from(table)
    .select("id, code, name, position, active, created_at, organization_id")
    .order("position", { ascending: true }));

  if (!result.error && (result.data?.length || !organizationId)) return result;
  if (!result.error && organizationId && !result.data?.length) {
    const defaultRows = await loadDefaultSettingRows(supabase, table);
    if (defaultRows.data?.length) return defaultRows;
  }
  if (organizationId && isMissingOrganizationColumnError(result.error)) {
    result = await supabase
      .from(table)
      .select("id, code, name, position, active, created_at")
      .order("position", { ascending: true });
    if (!result.error) return result;
  }
  if (isMissingTableError(result.error)) {
    return {
      data: fallbackRows.map((row) => ({ ...row, id: row.code, created_at: null })),
      error: null
    };
  }
  return result;
}

async function loadSettingRows(supabase, table, organizationId = "") {
  const applyOrg = (query) => (organizationId ? query.eq("organization_id", organizationId) : query);
  let result = await applyOrg(supabase
    .from(table)
    .select("id, code, name, position, active, created_at, organization_id")
    .order("position", { ascending: true }));

  if (!result.error && (result.data?.length || !organizationId)) return result;
  if (!result.error && organizationId && !result.data?.length) return loadDefaultSettingRows(supabase, table);
  if (result.error && organizationId && isMissingOrganizationColumnError(result.error)) {
    result = await supabase
      .from(table)
      .select("id, code, name, position, active, created_at")
      .order("position", { ascending: true });
  }
  return result;
}

async function loadDefaultSettingRows(supabase, table) {
  const defaultOrganizationId = await findDefaultOrganizationId(supabase);
  if (!defaultOrganizationId) return { data: [], error: null };
  return supabase
    .from(table)
    .select("id, code, name, position, active, created_at, organization_id")
    .eq("organization_id", defaultOrganizationId)
    .order("position", { ascending: true });
}

async function loadScopedRows(query, fallback) {
  const result = await query;
  if (!result.error) return result;
  if (isMissingOrganizationColumnError(result.error)) return fallback();
  return result;
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

function isMissingTableError(error) {
  return error?.code === "42P01" || /schema cache|does not exist|Could not find the table/i.test(error?.message || "");
}

function isGlobalAdmin(manager) {
  if (manager?.role !== "admin") return false;
  const configuredEmails = String(process.env.GLOBAL_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (configuredEmails.length) return configuredEmails.includes(String(manager.email || "").toLowerCase());
  return manager.organizations?.slug === "dovi-crm";
}

function isMissingOrganizationTableError(error) {
  return error?.code === "42P01" || /organizations|schema cache|does not exist/i.test(error?.message || "");
}

function isMissingPositionError(error) {
  return error?.code === "PGRST204" || /position|schema cache/i.test(error?.message || "");
}

function isMissingOrganizationColumnError(error) {
  return error?.code === "PGRST204" && /organization_id|schema cache/i.test(error?.message || "");
}

function isMissingMetaTokenColumnError(error) {
  return ["42703", "PGRST204"].includes(error?.code) && /meta_page_access_token|schema cache/i.test(error?.message || "");
}

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}
