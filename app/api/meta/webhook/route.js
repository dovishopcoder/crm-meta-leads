import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const verifyToken = process.env.META_VERIFY_TOKEN;
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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge || "", { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request) {
  const payload = await request.json();
  const supabase = serverSupabase();

  await supabase.from("meta_webhook_events").insert({
    meta_event_id: payload.event_id || payload.id || null,
    platform: payload.platform || null,
    payload,
    processed: false
  });

  const messages = normalizeWebhookPayload(payload);
  const processed = [];

  for (const message of messages) {
    const enrichedMessage = await enrichMessageProfile(message);
    const lead = await upsertLeadFromMessage(supabase, enrichedMessage);
    processed.push({ id: lead.id, name: lead.name, platform: lead.platform });
  }

  return NextResponse.json({ ok: true, processed });
}

function normalizeWebhookPayload(payload) {
  if (payload.test_contact_id || payload.name) {
    return [{
      metaContactId: payload.test_contact_id || payload.meta_contact_id || `manual-${Date.now()}`,
      name: payload.name || "Client Meta",
      platform: payload.platform || "facebook",
      avatarUrl: payload.avatar_url || "https://i.pravatar.cc/120?img=15",
      email: payload.email || "",
      pageId: payload.page_id || "",
      metaUrl: payload.meta_url || "https://business.facebook.com/latest/inbox/all",
      messageAt: payload.message_at || new Date().toISOString()
    }];
  }

  const messages = [];

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const senderId = value.sender?.id || value.from?.id || value.contact?.id;
      if (!senderId) continue;

      messages.push({
        metaContactId: senderId,
        name: value.sender?.name || value.from?.name || value.contact?.name || "Client Meta",
        platform: value.platform || change.field || payload.object || "facebook",
        avatarUrl: value.sender?.profile_pic || value.contact?.profile_pic || "https://i.pravatar.cc/120?img=15",
        email: value.sender?.email || value.from?.email || value.contact?.email || "",
        pageId: value.recipient?.id || value.page_id || entry.id || "",
        metaUrl: value.meta_url || "https://business.facebook.com/latest/inbox/all",
        messageAt: value.timestamp ? new Date(Number(value.timestamp)).toISOString() : new Date().toISOString()
      });
    }

    for (const messaging of entry.messaging || []) {
      const senderId = messaging.sender?.id;
      if (!senderId) continue;

      messages.push({
        metaContactId: senderId,
        name: messaging.sender?.name || "Client Meta",
        platform: payload.object === "instagram" ? "instagram" : "facebook",
        avatarUrl: "https://i.pravatar.cc/120?img=15",
        email: messaging.sender?.email || "",
        pageId: messaging.recipient?.id || entry.id || "",
        metaUrl: "https://business.facebook.com/latest/inbox/all",
        messageAt: messaging.timestamp ? new Date(Number(messaging.timestamp)).toISOString() : new Date().toISOString()
      });
    }
  }

  return messages;
}

async function enrichMessageProfile(message) {
  if (!pageAccessToken || !message.metaContactId) return message;

  try {
    const url = new URL(`https://graph.facebook.com/${graphVersion}/${message.metaContactId}`);
    url.searchParams.set("fields", "first_name,last_name,name,profile_pic,email");
    url.searchParams.set("access_token", pageAccessToken);

    const response = await fetch(url);
    if (!response.ok) return enrichMessageParticipants(message);

    const profile = await response.json();
    const name = profile.name || [profile.first_name, profile.last_name].filter(Boolean).join(" ");

    return enrichMessageParticipants({
      ...message,
      name: name || message.name,
      avatarUrl: profile.profile_pic || message.avatarUrl,
      email: profile.email || message.email || ""
    });
  } catch {
    return enrichMessageParticipants(message);
  }
}

async function enrichMessageParticipants(message) {
  if (message.email || !pageAccessToken || !message.metaContactId || !message.pageId) {
    return message;
  }

  try {
    const conversation = await findConversationForContact(message.pageId, message.metaContactId);
    if (!conversation?.id) return message;

    const url = new URL(`https://graph.facebook.com/${graphVersion}/${conversation.id}`);
    url.searchParams.set("fields", "participants");
    url.searchParams.set("access_token", pageAccessToken);

    const response = await fetch(url);
    if (!response.ok) return message;

    const data = await response.json();
    const participant = findClientParticipant(data.participants?.data || [], message.metaContactId, message.pageId);

    return {
      ...message,
      name: participant?.name || message.name,
      email: participant?.email || message.email || "",
      metaUrl: buildMetaConversationUrl(message.pageId, conversation.id)
    };
  } catch {
    return message;
  }
}

function buildMetaConversationUrl(pageId, conversationId) {
  const url = new URL("https://business.facebook.com/latest/inbox/all");
  if (pageId) {
    url.searchParams.set("asset_id", pageId);
    url.searchParams.set("mailbox_id", pageId);
  }
  if (conversationId) {
    url.searchParams.set("selected_item_id", conversationId);
    url.searchParams.set("thread_type", "FB_MESSAGE");
  }
  return url.toString();
}

async function findConversationForContact(pageId, contactId) {
  const directUrl = new URL(`https://graph.facebook.com/${graphVersion}/${pageId}/conversations`);
  directUrl.searchParams.set("fields", "participants");
  directUrl.searchParams.set("user_id", contactId);
  directUrl.searchParams.set("limit", "5");
  directUrl.searchParams.set("access_token", pageAccessToken);

  const directResponse = await fetch(directUrl);
  if (directResponse.ok) {
    const directData = await directResponse.json();
    const directConversation = findConversationWithContact(directData.data || [], contactId, pageId);
    if (directConversation) return directConversation;
  }

  const listUrl = new URL(`https://graph.facebook.com/${graphVersion}/${pageId}/conversations`);
  listUrl.searchParams.set("fields", "participants");
  listUrl.searchParams.set("limit", "25");
  listUrl.searchParams.set("access_token", pageAccessToken);

  const listResponse = await fetch(listUrl);
  if (!listResponse.ok) return null;

  const listData = await listResponse.json();
  return findConversationWithContact(listData.data || [], contactId, pageId);
}

function findConversationWithContact(conversations, contactId, pageId) {
  return conversations.find((conversation) => {
    const participants = conversation.participants?.data || [];
    return Boolean(findClientParticipant(participants, contactId, pageId));
  });
}

function findClientParticipant(participants, contactId, pageId) {
  return participants.find((participant) => {
    const participantId = participant.id || "";
    const participantEmail = participant.email || "";
    return participantId === contactId || participantEmail.startsWith(`${contactId}@`);
  }) || participants.find((participant) => {
    const participantId = participant.id || "";
    return participantId && participantId !== pageId;
  });
}

async function upsertLeadFromMessage(supabase, message) {
  const now = new Date().toISOString();
  const { data: existing, error: existingError } = await supabase
    .from("leads")
    .select("id, name, platform, meta_email")
    .eq("meta_contact_id", message.metaContactId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { data, error } = await supabase
      .from("leads")
      .update({
        name: message.name,
        avatar_url: message.avatarUrl,
        meta_url: message.metaUrl,
        meta_email: message.email || existing.meta_email || null,
        unread: true,
        last_message_at: message.messageAt || now,
        updated_at: now
      })
      .eq("id", existing.id)
      .select("id, name, platform")
      .single();

    if (error) throw error;
    await insertActivity(supabase, existing.id, "incoming_message", { source: "meta_webhook" });
    return data;
  }

  const { data: stage } = await supabase.from("stages").select("id").eq("code", "new").maybeSingle();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      meta_contact_id: message.metaContactId,
      platform: normalizePlatform(message.platform),
      name: message.name,
      avatar_url: message.avatarUrl,
      meta_url: message.metaUrl,
      meta_email: message.email || null,
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
  await insertActivity(supabase, data.id, "incoming_message", { source: "meta_webhook", created: true });
  return data;
}

async function insertActivity(supabase, leadId, type, payload) {
  await supabase.from("lead_activity").insert({
    lead_id: leadId,
    type,
    payload
  });
}

function normalizePlatform(platform) {
  return String(platform).toLowerCase().includes("instagram") ? "instagram" : "facebook";
}
