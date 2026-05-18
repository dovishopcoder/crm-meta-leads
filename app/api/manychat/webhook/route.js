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
  const manyChatId = normalizeManyChatContactId(readFirst(payload.id, payload.subscriber_id, payload.contact_id, contact.id, contact.subscriber_id, payload.key, contact.key));
  const firstName = readFirst(payload.first_name, contact.first_name);
  const lastName = readFirst(payload.last_name, contact.last_name);
  const fullName = readFirst(payload.name, payload.full_name, contact.name, contact.full_name, [firstName, lastName].filter(Boolean).join(" "));

  return {
    metaContactId: readFirst(payload.meta_contact_id, payload.psid, payload.facebook_id, contact.psid, contact.facebook_id, manyChatId),
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
  const existing = await findExistingLead(supabase, message);

  if (existing) {
    const wasArchived = Boolean(existing.archived_at);
    const { data: reactivatedStage } = wasArchived
      ? await supabase.from("stages").select("id").eq("code", "reactivated").maybeSingle()
      : { data: null };

    const { data, error } = await supabase
      .from("leads")
      .update(removeUndefined({
        meta_contact_id: message.metaContactId || undefined,
        name: message.name || existing.name,
        avatar_url: chooseAvatarUrl(existing.avatar_url, message.avatarUrl),
        meta_url: existing.meta_url || undefined,
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
      meta_url: "",
      meta_url_verified: false,
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

async function findExistingLead(supabase, message) {
  const idVariants = contactIdVariants(message.metaContactId);
  if (idVariants.length) {
    const { data, error } = await supabase
      .from("leads")
      .select("id, name, avatar_url, meta_contact_id, meta_email, meta_url, meta_url_verified, archived_at")
      .in("meta_contact_id", idVariants)
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) throw error;
    if (data?.[0]) return data[0];
  }

  if (message.email) {
    const { data, error } = await supabase
      .from("leads")
      .select("id, name, avatar_url, meta_contact_id, meta_email, meta_url, meta_url_verified, archived_at")
      .or(`customer_email.eq.${message.email},email.eq.${message.email},meta_email.eq.${message.email}`)
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) throw error;
    if (data?.[0]) return data[0];
  }

  if (message.phone) {
    const { data, error } = await supabase
      .from("leads")
      .select("id, name, avatar_url, meta_contact_id, meta_email, meta_url, meta_url_verified, archived_at")
      .eq("phone", message.phone)
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) throw error;
    if (data?.[0]) return data[0];
  }

  if (message.name) {
    const { data, error } = await supabase
      .from("leads")
      .select("id, name, avatar_url, meta_contact_id, meta_email, meta_url, meta_url_verified, archived_at")
      .eq("platform", message.platform)
      .ilike("name", message.name)
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) throw error;
    if (data?.[0]) return data[0];
  }

  return null;
}

function readFirst(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "")?.toString().trim() || "";
}

function normalizeManyChatContactId(value) {
  return String(value || "").trim().replace(/^user:/i, "").replace(/^manychat:/i, "");
}

function contactIdVariants(value) {
  const id = normalizeManyChatContactId(value);
  return [...new Set([id, id ? `manychat:${id}` : "", id ? `user:${id}` : ""].filter(Boolean))];
}

function normalizeDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function normalizePlatform(platform) {
  return String(platform).toLowerCase().includes("instagram") ? "instagram" : "facebook";
}

function chooseAvatarUrl(existingUrl, incomingUrl) {
  if (!isUsableAvatarUrl(incomingUrl)) return existingUrl || undefined;
  if (!existingUrl || !isUsableAvatarUrl(existingUrl)) return incomingUrl;
  return existingUrl;
}

function isUsableAvatarUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !["example.com", "localhost"].includes(url.hostname);
  } catch {
    return false;
  }
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
