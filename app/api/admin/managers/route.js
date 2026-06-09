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

    let { data: adminManager, error: adminError } = await supabase
      .from("managers")
      .select("id, role, active, organization_id")
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

    const managerPayload = {
      auth_user_id: authData.user.id,
      name,
      email,
      role,
      color,
      active: true
    };
    if (adminManager.organization_id) managerPayload.organization_id = adminManager.organization_id;

    let { error: managerError } = await supabase.from("managers").insert(managerPayload);
    if (managerError && isMissingOrganizationColumnError(managerError)) {
      delete managerPayload.organization_id;
      const retry = await supabase.from("managers").insert(managerPayload);
      managerError = retry.error;
    }

    if (managerError) throw managerError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Nu s-a putut adauga managerul." }, { status: 500 });
  }
}

export async function DELETE(request) {
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

    let { data: adminManager, error: adminError } = await supabase
      .from("managers")
      .select("id, role, active, organization_id")
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
    if (adminManager?.role !== "admin" || !adminManager.active) {
      return NextResponse.json({ error: "Doar adminul poate sterge manageri." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const managerId = searchParams.get("id");
    if (!managerId) {
      return NextResponse.json({ error: "Managerul lipseste." }, { status: 400 });
    }

    if (managerId === adminManager.id) {
      return NextResponse.json({ error: "Nu poti sterge adminul cu care esti logat." }, { status: 400 });
    }

    let managerQuery = supabase
      .from("managers")
      .select("id, auth_user_id")
      .eq("id", managerId);
    if (adminManager.organization_id) managerQuery = managerQuery.eq("organization_id", adminManager.organization_id);
    let { data: manager, error: managerLoadError } = await managerQuery.maybeSingle();

    if (managerLoadError && adminManager.organization_id && isMissingOrganizationColumnError(managerLoadError)) {
      const fallback = await supabase
        .from("managers")
        .select("id, auth_user_id")
        .eq("id", managerId)
        .maybeSingle();
      manager = fallback.data;
      managerLoadError = fallback.error;
    }

    if (managerLoadError) throw managerLoadError;
    if (!manager) {
      return NextResponse.json({ error: "Managerul nu exista." }, { status: 404 });
    }

    let deleteQuery = supabase.from("managers").delete().eq("id", managerId);
    if (adminManager.organization_id) deleteQuery = deleteQuery.eq("organization_id", adminManager.organization_id);
    let { error: deleteManagerError } = await deleteQuery;
    if (deleteManagerError && adminManager.organization_id && isMissingOrganizationColumnError(deleteManagerError)) {
      const retry = await supabase.from("managers").delete().eq("id", managerId);
      deleteManagerError = retry.error;
    }
    if (deleteManagerError) throw deleteManagerError;

    if (manager.auth_user_id) {
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(manager.auth_user_id);
      if (deleteUserError) {
        return NextResponse.json({ ok: true, warning: "Managerul a fost sters, dar userul Auth nu a putut fi sters automat." });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Nu s-a putut sterge managerul." }, { status: 500 });
  }
}

export async function PATCH(request) {
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

    let { data: adminManager, error: adminError } = await supabase
      .from("managers")
      .select("id, role, active, organization_id")
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
    if (adminManager?.role !== "admin" || !adminManager.active) {
      return NextResponse.json({ error: "Doar adminul poate schimba parole." }, { status: 403 });
    }

    const body = await request.json();
    const managerId = String(body.managerId || "").trim();
    const password = String(body.password || "");

    if (!managerId || !password) {
      return NextResponse.json({ error: "Alege managerul si parola noua." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Parola trebuie sa aiba minim 6 caractere." }, { status: 400 });
    }

    let managerQuery = supabase
      .from("managers")
      .select("id, email, auth_user_id")
      .eq("id", managerId);
    if (adminManager.organization_id) managerQuery = managerQuery.eq("organization_id", adminManager.organization_id);
    let { data: manager, error: managerError } = await managerQuery.maybeSingle();

    if (managerError && adminManager.organization_id && isMissingOrganizationColumnError(managerError)) {
      const fallback = await supabase
        .from("managers")
        .select("id, email, auth_user_id")
        .eq("id", managerId)
        .maybeSingle();
      manager = fallback.data;
      managerError = fallback.error;
    }

    if (managerError) throw managerError;
    if (!manager) {
      return NextResponse.json({ error: "Managerul nu exista." }, { status: 404 });
    }

    let authUserId = manager.auth_user_id;
    if (!authUserId && manager.email) {
      const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listError) throw listError;
      authUserId = authUsers.users.find((user) => user.email?.toLowerCase() === manager.email.toLowerCase())?.id;
    }

    if (!authUserId) {
      return NextResponse.json({ error: "Userul Auth pentru acest manager nu a fost gasit." }, { status: 404 });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(authUserId, { password });
    if (updateError) throw updateError;

    if (!manager.auth_user_id) {
      await supabase.from("managers").update({ auth_user_id: authUserId }).eq("id", manager.id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Nu s-a putut schimba parola." }, { status: 500 });
  }
}

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function isMissingOrganizationColumnError(error) {
  return error?.code === "PGRST204" && /organization_id|schema cache/i.test(error?.message || "");
}
