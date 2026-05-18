import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const webhookSecret = process.env.MANYCHAT_WEBHOOK_SECRET;

function serverSupabase() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server env is missing.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

export async function POST(request) {
  if (webhookSecret && request.headers.get("x-crm-webhook-secret") !== webhookSecret) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json();
  const supabase = serverSupabase();
  const leadInput = normalizeManyChatPayload(payload);
  const lead = await upsertManyChatLead(supabase, leadInput);

  return NextResponse.json({ ok: true, lead });
}

function normalizeManyChatPayload(payload) {
  const contact = payload.contact || payload.subscriber || payload.user || {};
  const manyChatId = readFirst(payload.id, payload.subscriber_id, payload.contact_id, contact.id, contact.subscriber_id);
  const firstName = readFirst(payload.first_name, contact.first_name);
  const lastName = readFirst(payload.last_name, contact.last_name);
  const fullName = readFirst(payload.name, payload.full_name, contact.name, contact.full_name, [firstName, lastName].filter(Boolean).join(" "));

  return {
    metaContactId: readFirst(payload.meta_contact_id, payload.psid, payload.facebook_id, contact.psid, contact.facebook_id, manyChatId ? `manychat:${manyChatId}` : ""),
    manyChatId: manyChatId || "",
    name: fullName || "Client ManyChat",
    platform: normalizePlatform(readFirst(payload.platform, payload.channel, contact.channel, "facebook")),
    avatarUrl: readFirst(payload.avatar_url, payload.profile_pic, payload.profile_pic_url, contact.avatar_url, contact.profile_pic, contact.profile_pic_url),
    metaUrl: readFirst(payload.meta_url, payload.inbox_url, payload.live_chat_url, payload.profile_url, contact.meta_url, contact.inbox_url, contact.live_chat_url),
    email: readFirst(payload.email, contact.email),
    phone: readFirst(payload.phone, payload.phone_number, contact.phone, contact.phone_number),
    messageAt: normalizeDate(readFirst(payload.message_at, payload.created_at, payload.last_interaction, contact.last_interaction)),
    raw: payload
  };
}

async function upsertManyChatLead(supabase, message) {
  const now = new Date().toISOString();
  const { data: existing, error: existingError } = await supabase
    .from("leads")
    .select("id, name, meta_email, meta_url, meta_url_verified, archived_at")
    .eq("meta_contact_id", message.metaContactId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const wasArchived = Boolean(existing.archived_at);
    const { data: reactivatedStage } = wasArchived
      ? await supabase.from("stages").select("id").eq("code", "reactivated").maybeSingle()
      : { data: null };

    const { data, error } = await supabase
      .from("leads")
      .update(removeUndefined({
        name: message.name || existing.name,
        avatar_url: message.avatarUrl || undefined,
        meta_url: chooseUrl(existing.meta_url, existing.meta_url_verified, message.metaUrl),
        customer_email: message.email || undefined,
        phone: message.phone || undefined,
        status: wasArchived ? "reactivated" : undefined,
        unread: true,
        archived_at: wasArchived ? null : undefined,
        stage_id: wasArchived && reactivatedStage?.id ? reactivatedStage.id : undefined,
        last_message_at: message.messageAt || now,
        updated_at: now
      }))
      .eq("id", existing.id)
      .select("id, name, platform")
      .single();

    if (error) throw error;
    await insertActivity(supabase, existing.id, wasArchived ? "reactivated_by_message" : "incoming_message", {
      source: "manychat",
      manyChatId: message.manyChatId || null
    });
    return data;
  }

  const { data: stage } = await supabase.from("stages").select("id").eq("code", "new").maybeSingle();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      meta_contact_id: message.metaContactId,
      platform: message.platform,
      name: message.name,
      avatar_url: message.avatarUrl || "",
      meta_url: message.metaUrl || "",
      meta_url_verified: Boolean(message.metaUrl),
      customer_email: message.email || null,
      phone: message.phone || null,
      status: "new",
      priority: "normal",
      unread: true,
      stage_id: stage?.id || null,
      first_message_at: message.messageAt || now,
      last_message_at: message.messageAt || now,
      processed_count: 0
    })
    .select("id, name, platform")
    .single();

  if (error) throw error;
  await insertActivity(supabase, data.id, "incoming_message", {
    source: "manychat",
    created: true,
    manyChatId: message.manyChatId || null
  });
  return data;
}

function readFirst(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "")?.toString().trim() || "";
}

function normalizeDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function normalizePlatform(platform) {
  return String(platform).toLowerCase().includes("instagram") ? "instagram" : "facebook";
}

function chooseUrl(existingUrl, existingVerified, incomingUrl) {
  if (existingVerified && existingUrl) return existingUrl;
  return incomingUrl || existingUrl || "";
}

function removeUndefined(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

async function insertActivity(supabase, leadId, type, payload) {
  await supabase.from("lead_activity").insert({
    lead_id: leadId,
    type,
    payload
  });
}
