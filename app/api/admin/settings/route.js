import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TABLES = {
  stage: "stages",
  product: "products",
  status: "lead_statuses",
  religion: "religions"
};

function serverSupabase() {
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase server env is missing.");
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

function publicSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase public env is missing.");
  return createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
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

    const { data, error } = await supabase.from(table).insert(payload).select("*").single();
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
    if (!table || !id) return NextResponse.json({ error: "Setarea lipseste." }, { status: 400 });

    const payload = buildPayload(type, body);
    if (!payload.code || !payload.name) {
      return NextResponse.json({ error: "Completeaza codul si numele." }, { status: 400 });
    }

    const { data, error } = await supabase.from(table).update(payload).eq("id", id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Nu s-a putut actualiza setarea." }, { status: 500 });
  }
}

async function requireAdmin(request, supabase) {
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
  if (adminManager?.role !== "admin" || !adminManager.active) throw new Error("Doar adminul poate modifica setarile.");
}

function buildPayload(type, body) {
  const payload = {
    code: String(body.code || "").trim(),
    name: String(body.name || "").trim(),
    active: body.active !== false
  };

  if (type !== "product") {
    payload.position = Number(body.position) || 0;
  }

  return payload;
}

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}
