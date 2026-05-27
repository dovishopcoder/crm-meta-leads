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
    await requireManager(request, supabase);

    const [managerResult, stageResult, productResult, statusResult, religionResult, hookResult, currentInterestResult, needCategoryResult, audienceResult] = await Promise.all([
      supabase.from("managers").select("id, name, email, role, color, active, created_at").order("created_at", { ascending: true }),
      supabase.from("stages").select("id, code, name, position, active, created_at").order("position", { ascending: true }),
      loadProductRows(supabase),
      loadOptionRows(supabase, "lead_statuses", DEFAULT_STATUSES),
      loadOptionRows(supabase, "religions", DEFAULT_RELIGIONS),
      loadOptionRows(supabase, "hook_options", DEFAULT_HOOKS),
      loadOptionRows(supabase, "current_interests", DEFAULT_CURRENT_INTERESTS),
      loadOptionRows(supabase, "need_categories", DEFAULT_NEED_CATEGORIES),
      supabase
        .from("leads")
        .select("id, name, platform, customer_email, meta_email, meta_contact_id, phone, first_message_at, archived_at, managers(name), stages(code, name), lead_tags(tag), lead_products(products(code, name))")
        .order("created_at", { ascending: false })
    ]);

    for (const result of [managerResult, stageResult, productResult, statusResult, religionResult, hookResult, currentInterestResult, needCategoryResult, audienceResult]) {
      if (result.error) throw result.error;
    }

    return NextResponse.json({
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
    await requireAdmin(request, supabase);
    const body = await request.json();
    const type = String(body.type || "").trim();
    const table = TABLES[type];
    if (!table) return NextResponse.json({ error: "Tip setare invalid." }, { status: 400 });

    const payload = buildPayload(type, body);
    if (!payload.code || !payload.name) {
      return NextResponse.json({ error: "Completeaza codul si numele." }, { status: 400 });
    }
    if (payload.position === undefined) {
      payload.position = await nextPosition(supabase, table);
    }

    let { data, error } = await supabase.from(table).insert(payload).select("*").single();
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
    await requireAdmin(request, supabase);
    const body = await request.json();
    const type = String(body.type || "").trim();
    const table = TABLES[type];
    const id = String(body.id || "").trim();
    if (!table) return NextResponse.json({ error: "Setarea lipseste." }, { status: 400 });

    if (Array.isArray(body.order)) {
      await updateOrder(supabase, table, body.order);
      return NextResponse.json({ ok: true });
    }

    if (!id) return NextResponse.json({ error: "Setarea lipseste." }, { status: 400 });

    const payload = buildPayload(type, body);
    if (!payload.code || !payload.name) {
      return NextResponse.json({ error: "Completeaza codul si numele." }, { status: 400 });
    }

    let { data, error } = await supabase.from(table).update(payload).eq("id", id).select("*").single();
    if (error && isMissingPositionError(error) && "position" in payload) {
      delete payload.position;
      const retry = await supabase.from(table).update(payload).eq("id", id).select("*").single();
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
    await requireAdmin(request, supabase);
    const body = await request.json();
    const type = String(body.type || "").trim();
    const table = TABLES[type];
    const id = String(body.id || "").trim();
    if (!table || !id) return NextResponse.json({ error: "Setarea lipseste." }, { status: 400 });

    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Nu s-a putut sterge setarea." }, { status: 500 });
  }
}

async function requireAdmin(request, supabase) {
  const manager = await requireManager(request, supabase);
  if (manager.role !== "admin") throw new Error("Doar adminul poate modifica setarile.");
}

async function requireManager(request, supabase) {
  const token = getBearerToken(request);
  if (!token) throw new Error("Sesiunea admin lipseste.");

  const authClient = publicSupabase();
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user?.email) throw new Error("Sesiunea admin nu este valida.");

  const { data: adminManager, error: adminError } = await supabase
    .from("managers")
    .select("id, role, active")
    .eq("email", userData.user.email)
    .maybeSingle();

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

async function nextPosition(supabase, table) {
  const result = await supabase
    .from(table)
    .select("position")
    .order("position", { ascending: false })
    .limit(1);

  if (result.error) {
    if (isMissingPositionError(result.error)) return undefined;
    throw result.error;
  }
  return Number(result.data?.[0]?.position || 0) + 1;
}

async function updateOrder(supabase, table, order) {
  for (const item of order) {
    const id = String(item.id || "").trim();
    if (!id) continue;
    const { error } = await supabase
      .from(table)
      .update({ position: Number(item.position) || 0 })
      .eq("id", id);
    if (error) throw error;
  }
}

async function loadProductRows(supabase) {
  const result = await supabase
    .from("products")
    .select("id, code, name, position, active, created_at")
    .order("position", { ascending: true });

  if (!result.error) return result;
  if (!isMissingPositionError(result.error)) return result;

  const fallback = await supabase
    .from("products")
    .select("id, code, name, active, created_at")
    .order("created_at", { ascending: true });

  if (fallback.error) return fallback;
  return {
    data: (fallback.data || []).map((product, index) => ({ ...product, position: index + 1 })),
    error: null
  };
}

async function loadOptionRows(supabase, table, fallbackRows) {
  const result = await supabase
    .from(table)
    .select("id, code, name, position, active, created_at")
    .order("position", { ascending: true });

  if (!result.error) return result;
  if (isMissingTableError(result.error)) {
    return {
      data: fallbackRows.map((row) => ({ ...row, id: row.code, created_at: null })),
      error: null
    };
  }
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

function isMissingPositionError(error) {
  return error?.code === "PGRST204" || /position|schema cache/i.test(error?.message || "");
}

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}
