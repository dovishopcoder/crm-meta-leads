import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function serverSupabase() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server env is missing.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

function publicSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase public env is missing.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });
}

export async function POST(request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "Sesiunea admin lipseste." }, { status: 401 });
    }

    const supabase = serverSupabase();
    const authClient = publicSupabase();
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData.user?.email) {
      return NextResponse.json({ error: "Sesiunea admin nu este valida." }, { status: 401 });
    }

    const { data: adminManager, error: adminError } = await supabase
      .from("managers")
      .select("id, role, active")
      .eq("email", userData.user.email)
      .maybeSingle();

    if (adminError) throw adminError;
    if (adminManager?.role !== "admin" || !adminManager.active) {
      return NextResponse.json({ error: "Doar adminul poate adauga manageri." }, { status: 403 });
    }

    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = body.role === "admin" ? "admin" : "manager";
    const color = String(body.color || "#1e8f72").trim() || "#1e8f72";

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Completeaza nume, email si parola temporara." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Parola trebuie sa aiba minim 6 caractere." }, { status: 400 });
    }

    const { data: authData, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role }
    });

    if (createUserError) {
      return NextResponse.json({ error: createUserError.message }, { status: 400 });
    }

    const { error: managerError } = await supabase.from("managers").insert({
      auth_user_id: authData.user.id,
      name,
      email,
      role,
      color,
      active: true
    });

    if (managerError) throw managerError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Nu s-a putut adauga managerul." }, { status: 500 });
  }
}

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}
