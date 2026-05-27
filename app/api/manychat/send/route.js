import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const manyChatApiKey = process.env.MANYCHAT_API_KEY;
const manyChatSendEndpoint = process.env.MANYCHAT_SEND_ENDPOINT || "https://api.manychat.com/fb/sending/sendContent";

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
    if (!manyChatApiKey) {
      return NextResponse.json({ error: "ManyChat API key nu este configurat pe server." }, { status: 500 });
    }

    const token = getBearerToken(request);
    if (!token) return NextResponse.json({ error: "Sesiunea lipseste." }, { status: 401 });

    const supabase = serverSupabase();
    const manager = await requireActiveManager(token, supabase);
    const body = await request.json();
    const leadId = String(body.leadId || "").trim();
    const text = String(body.text || "").trim();

    if (!leadId) return NextResponse.json({ error: "Lead-ul lipseste." }, { status: 400 });
    if (!text) return NextResponse.json({ error: "Scrie mesajul inainte de trimitere." }, { status: 400 });
    if (text.length > 2000) return NextResponse.json({ error: "Mesajul este prea lung." }, { status: 400 });

    const lead = await loadLeadForSending(supabase, leadId);
    const subscriberId = lead.manychat_id || normalizeManyChatId(lead.meta_contact_id);
    if (!subscriberId) {
      return NextResponse.json({ error: "Acest lead nu are ID ManyChat pentru trimitere." }, { status: 400 });
    }

    const manyChatPayload = {
      subscriber_id: String(subscriberId),
      data: {
        version: "v2",
        content: {
          messages: [{ type: "text", text }],
          actions: [],
          quick_replies: []
        }
      }
    };

    const manyChatResponse = await fetch(manyChatSendEndpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${manyChatApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(manyChatPayload)
    });

    const responseText = await manyChatResponse.text();
    const responsePayload = parseJson(responseText);

    if (!manyChatResponse.ok || responsePayload?.status === "error") {
      const message = manyChatErrorMessage(manyChatResponse.status, responsePayload, responseText);
      await safeInsertOutgoingMessage(supabase, lead.id, manager.id, text, "failed", "", message);
      return jsonError(message, 400);
    }

    const savedMessage = await insertOutgoingMessage(
      supabase,
      lead.id,
      manager.id,
      text,
      "sent",
      responsePayload?.data?.message_id || responsePayload?.message_id || "",
      ""
    );

    await supabase.from("leads").update({ updated_at: new Date().toISOString() }).eq("id", lead.id);

    return NextResponse.json({
      ok: true,
      message: {
        id: savedMessage.id,
        direction: savedMessage.direction,
        body: savedMessage.body,
        managerId: manager.code,
        status: savedMessage.status,
        error: savedMessage.error || "",
        sentAt: savedMessage.sent_at,
        createdAt: savedMessage.created_at
      }
    });
  } catch (error) {
    console.error("ManyChat send error:", error);
    return jsonError(error.message || "Mesajul nu a putut fi trimis.", 500);
  }
}

async function requireActiveManager(token, supabase) {
  const authClient = publicSupabase();
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user?.email) throw new Error("Sesiunea nu este valida.");

  const { data: manager, error } = await supabase
    .from("managers")
    .select("id, name, role, active")
    .eq("email", userData.user.email)
    .maybeSingle();

  if (error) throw error;
  if (!manager?.active) throw new Error("Contul logat nu este manager activ.");
  return { ...manager, code: managerNameToCode(manager.name) };
}

async function loadLeadForSending(supabase, leadId) {
  let { data, error } = await supabase
    .from("leads")
    .select("id, meta_contact_id, manychat_id")
    .eq("id", leadId)
    .maybeSingle();

  if (error && isMissingManyChatColumnError(error)) {
    const fallback = await supabase
      .from("leads")
      .select("id, meta_contact_id")
      .eq("id", leadId)
      .maybeSingle();
    data = fallback.data ? { ...fallback.data, manychat_id: "" } : null;
    error = fallback.error;
  }

  if (error) throw error;
  if (!data) throw new Error("Lead-ul nu exista.");
  return data;
}

async function insertOutgoingMessage(supabase, leadId, managerId, text, status, externalId, errorMessage) {
  const { data, error } = await supabase
    .from("lead_messages")
    .insert({
      lead_id: leadId,
      direction: "outgoing",
      body: text,
      manager_id: managerId,
      external_id: externalId || null,
      status,
      error: errorMessage || null,
      sent_at: new Date().toISOString()
    })
    .select("id, direction, body, manager_id, status, error, sent_at, created_at")
    .single();

  if (error) throw error;
  return data;
}

async function safeInsertOutgoingMessage(supabase, leadId, managerId, text, status, externalId, errorMessage) {
  try {
    return await insertOutgoingMessage(supabase, leadId, managerId, text, status, externalId, errorMessage);
  } catch (error) {
    console.error("Failed to save outgoing message:", error);
    return null;
  }
}

function manyChatErrorMessage(status, payload, text) {
  const jsonMessage = payload?.message || payload?.error || payload?.description;
  if (isMessagingWindowError(jsonMessage)) {
    return "Puntea de mesaje poate trimite din CRM doar in primele 24h de la ultimul mesaj al clientului. Pentru acest client trimite din ManyChat/Meta sau asteapta ca el sa scrie din nou.";
  }
  if (jsonMessage) return `Puntea de mesaje nu a putut trimite mesajul: ${jsonMessage}`;

  const cleanText = String(text || "").replace(/\s+/g, " ").trim();
  if (cleanText.startsWith("<!DOCTYPE") || cleanText.startsWith("<html")) {
    return `Puntea de mesaje nu a raspuns corect. Status: ${status}. Verifica daca API-ul este activ si daca trimiterea mesajelor este permisa.`;
  }

  return `Puntea de mesaje nu a acceptat mesajul. Status: ${status}${cleanText ? `: ${cleanText.slice(0, 180)}` : ""}`;
}

function isMessagingWindowError(message) {
  const normalized = String(message || "").toLowerCase();
  return normalized.includes("last interaction") && normalized.includes("24 hour");
}

function jsonError(message, status) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeManyChatId(value) {
  return String(value || "").trim().replace(/^manychat:/i, "").replace(/^user:/i, "");
}

function managerNameToCode(name) {
  return String(name || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unassigned";
}

function isMissingManyChatColumnError(error) {
  return error?.code === "PGRST204" && /manychat_id/i.test(error?.message || "");
}
