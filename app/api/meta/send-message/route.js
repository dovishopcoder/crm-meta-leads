import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
const graphVersion = process.env.META_GRAPH_VERSION || "v21.0";

function serverSupabase() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server env is missing.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

export async function POST(request) {
  try {
    const token = getBearerToken(request);
    if (!token) return NextResponse.json({ error: "Sesiunea lipseste." }, { status: 401 });
    if (!pageAccessToken) return NextResponse.json({ error: "META_PAGE_ACCESS_TOKEN lipseste pe server." }, { status: 500 });

    const supabase = serverSupabase();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user?.email) {
      return NextResponse.json({ error: "Sesiunea nu este valida." }, { status: 401 });
    }

    const { data: manager, error: managerError } = await supabase
      .from("managers")
      .select("id, role, active")
      .eq("email", userData.user.email)
      .maybeSingle();

    if (managerError) throw managerError;
    if (!manager?.active) {
      return NextResponse.json({ error: "Managerul nu este activ." }, { status: 403 });
    }

    const body = await request.json();
    const leadId = String(body.leadId || "");
    const text = String(body.text || "").trim();
    if (!leadId || !text) {
      return NextResponse.json({ error: "Alege lead-ul si scrie mesajul." }, { status: 400 });
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, name, platform, meta_contact_id, meta_url")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError) throw leadError;
    if (!lead?.meta_contact_id) {
      return NextResponse.json({ error: "Lead-ul nu are Meta contact ID." }, { status: 400 });
    }

    if (lead.platform !== "facebook") {
      return NextResponse.json({ error: "Trimiterea directa este activata acum doar pentru Facebook Messenger." }, { status: 400 });
    }

    const pageId = getPageId(lead.meta_url);
    if (!pageId) {
      return NextResponse.json({ error: "Nu am putut identifica Page ID pentru acest lead." }, { status: 400 });
    }

    const metaResponse = await sendFacebookMessage(pageId, lead.meta_contact_id, text);
    if (!metaResponse.ok) {
      return NextResponse.json({ error: metaResponse.error || "Meta nu a acceptat mesajul." }, { status: 400 });
    }

    await supabase.from("lead_activity").insert({
      lead_id: lead.id,
      manager_id: manager.id,
      type: "outgoing_message",
      payload: { source: "crm", text }
    });

    await supabase
      .from("leads")
      .update({
        unread: false,
        last_processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", lead.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Mesajul nu a putut fi trimis." }, { status: 500 });
  }
}

async function sendFacebookMessage(pageId, recipientId, text) {
  const url = new URL(`https://graph.facebook.com/${graphVersion}/${pageId}/messages`);
  url.searchParams.set("access_token", pageAccessToken);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message_type: "RESPONSE",
      message: { text }
    })
  });

  const payload = await response.json();
  return {
    ok: response.ok,
    error: payload.error?.message || null,
    payload
  };
}

function getPageId(metaUrl) {
  try {
    const url = new URL(metaUrl || "");
    return url.searchParams.get("asset_id") || url.searchParams.get("mailbox_id") || process.env.META_PAGE_ID || "";
  } catch {
    return process.env.META_PAGE_ID || "";
  }
}

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}
