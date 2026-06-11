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
    const organization = await resolveOrganization(supabase, message);
    const enrichedMessage = await enrichMessageProfile(message, organization);
    const lead = await upsertLeadFromMessage(supabase, enrichedMessage, organization);
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
      avatarUrl: payload.avatar_url || "",
      email: payload.email || "",
      pageId: payload.page_id || "",
      metaUrl: payload.meta_url || "https://business.facebook.com/latest/inbox/all",
      text: payload.message_text || payload.text || payload.message || "",
      externalMessageId: payload.message_id || payload.mid || "",
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
        avatarUrl: value.sender?.profile_pic || value.contact?.profile_pic || "",
        email: value.sender?.email || value.from?.email || value.contact?.email || "",
        pageId: value.recipient?.id || value.page_id || entry.id || "",
        metaUrl: value.meta_url || "https://business.facebook.com/latest/inbox/all",
        text: value.message?.text || value.text || value.message || "",
        externalMessageId: value.message?.mid || value.mid || value.message_id || "",
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
        avatarUrl: "",
        email: messaging.sender?.email || "",
        pageId: messaging.recipient?.id || entry.id || "",
        metaUrl: "https://business.facebook.com/latest/inbox/all",
        text: messaging.message?.text || messaging.postback?.title || "",
        externalMessageId: messaging.message?.mid || messaging.postback?.mid || "",
        messageAt: messaging.timestamp ? new Date(Number(messaging.timestamp)).toISOString() : new Date().toISOString()
      });
    }
  }

  return messages;
}

async function enrichMessageProfile(message, organization = null) {
  const accessToken = organization?.meta_page_access_token || pageAccessToken;
  if (!accessToken || !message.metaContactId) return message;

  try {
    const url = new URL(`https://graph.facebook.com/${graphVersion}/${message.metaContactId}`);
    url.searchParams.set("fields", "first_name,last_name,name,profile_pic,email");
    url.searchParams.set("access_token", accessToken);

    const response = await fetch(url);
    if (!response.ok) return enrichMessageParticipants(message, accessToken);

    const profile = await response.json();
    const name = profile.name || [profile.first_name, profile.last_name].filter(Boolean).join(" ");

    return enrichMessageParticipants({
      ...message,
      name: name || message.name,
      avatarUrl: profile.profile_pic || message.avatarUrl,
      email: profile.email || message.email || ""
    }, accessToken);
  } catch {
    return enrichMessageParticipants(message, accessToken);
  }
}

async function enrichMessageParticipants(message, accessToken = pageAccessToken) {
  if (message.email || !accessToken || !message.metaContactId || !message.pageId) {
    return message;
  }

  try {
    const conversation = await findConversationForContact(message.pageId, message.metaContactId, accessToken);
    if (!conversation?.id) return message;

    const url = new URL(`https://graph.facebook.com/${graphVersion}/${conversation.id}`);
    url.searchParams.set("fields", "participants");
    url.searchParams.set("access_token", accessToken);

    const response = await fetch(url);
    if (!response.ok) return message;

    const data = await response.json();
    const participant = findClientParticipant(data.participants?.data || [], message.metaContactId, message.pageId);

    const conversationLink = normalizeMetaConversationLink(conversation.link);

    return {
      ...message,
      name: participant?.name || message.name,
      email: participant?.email || message.email || "",
      metaUrl: conversationLink || buildMetaConversationUrl(message.pageId, conversation.id),
      metaUrlSource: conversationLink ? "conversation_link" : "generated_from_conversation_id",
      metaConversationId: conversation.id
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
    url.searchParams.set("selected_item_id", normalizeSelectedItemId(conversationId));
    url.searchParams.set("thread_type", "FB_MESSAGE");
  }
  return url.toString();
}

function normalizeMetaConversationLink(link) {
  if (!link) return "";

  try {
    const url = new URL(link, "https://business.facebook.com");
    if (url.hostname !== "business.facebook.com") return link;

    const inboxMatch = url.pathname.match(/^\/([^/]+)\/inbox\/([^/]+)/);
    if (inboxMatch) {
      return buildMetaConversationUrl(inboxMatch[1], inboxMatch[2]);
    }

    if (!url.searchParams.get("thread_type") && url.searchParams.get("selected_item_id")) {
      url.searchParams.set("thread_type", "FB_MESSAGE");
    }
    return url.toString();
  } catch {
    return link;
  }
}

async function findConversationForContact(pageId, contactId, accessToken = pageAccessToken) {
  const contactUrl = new URL(`https://graph.facebook.com/${graphVersion}/${contactId}/conversations`);
  contactUrl.searchParams.set("fields", "id,link,participants,updated_time");
  contactUrl.searchParams.set("limit", "5");
  contactUrl.searchParams.set("access_token", accessToken);

  const contactResponse = await fetch(contactUrl);
  if (contactResponse.ok) {
    const contactData = await contactResponse.json();
    const contactConversation = findConversationWithContact(contactData.data || [], contactId, pageId) || contactData.data?.[0];
    if (contactConversation) return contactConversation;
  }

  const directUrl = new URL(`https://graph.facebook.com/${graphVersion}/${pageId}/conversations`);
  directUrl.searchParams.set("fields", "id,link,participants,updated_time");
  directUrl.searchParams.set("user_id", contactId);
  directUrl.searchParams.set("limit", "5");
  directUrl.searchParams.set("access_token", accessToken);

  const directResponse = await fetch(directUrl);
  if (directResponse.ok) {
    const directData = await directResponse.json();
    const directConversation = findConversationWithContact(directData.data || [], contactId, pageId);
    if (directConversation) return directConversation;
  }

  const listUrl = new URL(`https://graph.facebook.com/${graphVersion}/${pageId}/conversations`);
  listUrl.searchParams.set("fields", "id,link,participants,updated_time");
  listUrl.searchParams.set("limit", "25");
  listUrl.searchParams.set("access_token", accessToken);

  const listResponse = await fetch(listUrl);
  if (!listResponse.ok) return null;

  const listData = await listResponse.json();
  return findConversationWithContact(listData.data || [], contactId, pageId);
}

function normalizeSelectedItemId(value) {
  return String(value || "").replace(/^t_/, "");
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

async function upsertLeadFromMessage(supabase, message, organization) {
  const now = new Date().toISOString();
  const organizationId = organization?.id || "";
  const contactIds = contactIdVariants(message.metaContactId);
  let existingQuery = supabase
    .from("leads")
    .select("id, name, platform, meta_email, meta_url, meta_url_verified, archived_at, organization_id")
    .in("meta_contact_id", contactIds)
    .order("created_at", { ascending: true })
    .limit(1);
  if (organizationId) existingQuery = existingQuery.eq("organization_id", organizationId);
  let { data: existing, error: existingError } = await existingQuery;

  if (existingError && organizationId && isMissingOrganizationColumnError(existingError)) {
    const fallback = await supabase
      .from("leads")
      .select("id, name, platform, meta_email, meta_url, meta_url_verified, archived_at")
      .in("meta_contact_id", contactIds)
      .order("created_at", { ascending: true })
      .limit(1);
    existing = fallback.data;
    existingError = fallback.error;
  }

  if (existingError) throw existingError;
  const existingLead = existing?.[0];

  if (existingLead) {
    const wasArchived = Boolean(existingLead.archived_at);
    const { data: reactivatedStage } = wasArchived
      ? await scopedMaybeSingle(supabase.from("stages").select("id").eq("code", "reactivated"), organizationId)
      : { data: null };
    const updatePayload = {
        organization_id: organizationId || undefined,
        meta_contact_id: message.metaContactId,
        name: message.name,
        avatar_url: message.avatarUrl,
        meta_url: chooseMetaUrl(existingLead.meta_url, existingLead.meta_url_verified, message.metaUrl, message.metaContactId),
        meta_email: message.email || existingLead.meta_email || null,
        status: wasArchived ? "reactivated" : undefined,
        unread: true,
        archived_at: wasArchived ? null : undefined,
        stage_id: wasArchived && reactivatedStage?.id ? reactivatedStage.id : undefined,
        last_message_at: message.messageAt || now,
        updated_at: now
      };
    const { data, error } = await saveLeadMutationWithFallback(() => supabase
      .from("leads")
      .update(removeUndefined(updatePayload))
      .eq("id", existingLead.id)
      .select("id, name, platform")
      .single(), updatePayload);

    if (error) throw error;
    await insertIncomingMessage(supabase, existingLead.id, message);
    await insertActivity(supabase, existingLead.id, wasArchived ? "reactivated_by_message" : "incoming_message", {
      source: "meta_webhook",
      metaUrlSource: message.metaUrlSource || null,
      metaConversationId: message.metaConversationId || null
    });
    return data;
  }

  const { data: stage } = await scopedMaybeSingle(supabase.from("stages").select("id").eq("code", "new"), organizationId);
  const insertPayload = {
      organization_id: organizationId || null,
      meta_contact_id: message.metaContactId,
      platform: normalizePlatform(message.platform),
      name: message.name,
      avatar_url: message.avatarUrl,
      meta_url: message.metaUrl,
      meta_url_verified: false,
      meta_email: message.email || null,
      status: "new",
      priority: "normal",
      unread: true,
      stage_id: stage?.id || null,
      first_message_at: message.messageAt || now,
      last_message_at: message.messageAt || now,
      processed_count: 0
    };
  const { data, error } = await saveLeadMutationWithFallback(() => supabase
    .from("leads")
    .insert(insertPayload)
    .select("id, name, platform")
    .single(), insertPayload);

  if (error) throw error;
  await insertIncomingMessage(supabase, data.id, message);
  await insertActivity(supabase, data.id, "incoming_message", {
    source: "meta_webhook",
    created: true,
    metaUrlSource: message.metaUrlSource || null,
    metaConversationId: message.metaConversationId || null
  });
  return data;
}

function chooseMetaUrl(existingUrl, existingVerified, generatedUrl, contactId) {
  if (existingVerified && existingUrl) return existingUrl;
  if (!existingUrl) return generatedUrl;

  try {
    const existing = new URL(existingUrl);
    const generated = new URL(generatedUrl);
    const existingSelectedId = existing.searchParams.get("selected_item_id");
    const generatedSelectedId = generated.searchParams.get("selected_item_id");

    if (existingSelectedId && generatedSelectedId === contactId && existingSelectedId !== generatedSelectedId) {
      return existingUrl;
    }
  } catch {
    return generatedUrl;
  }

  return generatedUrl;
}

async function resolveOrganization(supabase, message) {
  const pageId = String(message.pageId || "").trim();
  if (pageId) {
    let { data, error } = await supabase
      .from("organizations")
      .select("id, name, slug, meta_page_access_token")
      .or(`meta_page_id.eq.${pageId},manychat_page_id.eq.${pageId}`)
      .eq("active", true)
      .maybeSingle();
    if (isMissingMetaTokenColumnError(error)) {
      const fallback = await supabase
        .from("organizations")
        .select("id, name, slug")
        .or(`meta_page_id.eq.${pageId},manychat_page_id.eq.${pageId}`)
        .eq("active", true)
        .maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }
    if (!error && data) return data;
    if (error && !isMissingOrganizationTableError(error)) throw error;
  }

  let { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, meta_page_access_token")
    .eq("slug", "dovi-crm")
    .maybeSingle();
  if (isMissingMetaTokenColumnError(error)) {
    const fallback = await supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("slug", "dovi-crm")
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }
  if (!error) return data || null;
  if (isMissingOrganizationTableError(error)) return null;
  throw error;
}

async function scopedMaybeSingle(query, organizationId) {
  let scoped = query;
  if (organizationId) scoped = scoped.eq("organization_id", organizationId);
  const result = await scoped.maybeSingle();
  if (!result.error) return result;
  if (organizationId && isMissingOrganizationColumnError(result.error)) return query.maybeSingle();
  return result;
}

async function saveLeadMutationWithFallback(action, payload) {
  let result = await action();
  if (result.error && isMissingOrganizationColumnError(result.error) && "organization_id" in payload) {
    delete payload.organization_id;
    result = await action();
  }
  return result;
}

function removeUndefined(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

function isMissingOrganizationColumnError(error) {
  return error?.code === "PGRST204" && /organization_id|schema cache/i.test(error?.message || "");
}

function isMissingMetaTokenColumnError(error) {
  return ["42703", "PGRST204"].includes(error?.code) && /meta_page_access_token|schema cache/i.test(error?.message || "");
}

function isMissingOrganizationTableError(error) {
  return error?.code === "42P01" || /organizations|schema cache|does not exist/i.test(error?.message || "");
}

async function insertActivity(supabase, leadId, type, payload) {
  await supabase.from("lead_activity").insert({
    lead_id: leadId,
    type,
    payload
  });
}

async function insertIncomingMessage(supabase, leadId, message) {
  if (!message.text) return;

  const externalId = message.externalMessageId || buildMessageExternalId(message);
  if (externalId) {
    const { data: existing, error: lookupError } = await supabase
      .from("lead_messages")
      .select("id")
      .eq("external_id", externalId)
      .limit(1);

    if (lookupError) {
      if (isMissingMessageTableError(lookupError)) return;
      throw lookupError;
    }
    if (existing?.length) return;
  }

  const { error } = await supabase.from("lead_messages").insert({
    lead_id: leadId,
    direction: "incoming",
    body: message.text,
    external_id: externalId || null,
    status: "received",
    sent_at: message.messageAt || new Date().toISOString()
  });

  if (error) {
    if (isMissingMessageTableError(error)) return;
    if (error.code === "23505") return;
    throw error;
  }
}

function buildMessageExternalId(message) {
  if (!message.metaContactId || !message.text) return "";
  const stamp = message.messageAt || "";
  return `meta:${message.metaContactId}:${stamp}:${hashText(message.text)}`;
}

function hashText(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function isMissingMessageTableError(error) {
  return error?.code === "42P01" || /lead_messages|schema cache|does not exist/i.test(error?.message || "");
}

function normalizePlatform(platform) {
  return String(platform).toLowerCase().includes("instagram") ? "instagram" : "facebook";
}

function contactIdVariants(value) {
  const id = String(value || "").trim().replace(/^manychat:/i, "").replace(/^user:/i, "");
  return [...new Set([id, id ? `manychat:${id}` : "", id ? `user:${id}` : ""].filter(Boolean))];
}
