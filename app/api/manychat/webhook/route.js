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
  const organization = await resolveOrganization(supabase, leadInput);
  const lead = await upsertManyChatLead(supabase, leadInput, organization);

  return NextResponse.json({ ok: true, lead });
}

function normalizeManyChatPayload(payload) {
  const contact = payload.contact || payload.subscriber || payload.user || {};
  const manyChatId = normalizeManyChatContactId(readFirst(payload.id, payload.subscriber_id, payload.contact_id, contact.id, contact.subscriber_id, payload.key, contact.key));
  const firstName = readFirst(payload.first_name, contact.first_name);
  const lastName = readFirst(payload.last_name, contact.last_name);
  const fullName = readFirst(payload.name, payload.full_name, contact.name, contact.full_name, [firstName, lastName].filter(Boolean).join(" "));
  const page = payload.page || payload.facebook_page || contact.page || {};

  return {
    pageId: readFirst(payload.page_id, payload.facebook_page_id, payload.fb_page_id, page.id, page.page_id, contact.page_id),
    metaContactId: readFirst(payload.meta_contact_id, payload.psid, payload.facebook_id, contact.psid, contact.facebook_id, manyChatId),
    manyChatId: manyChatId || "",
    name: fullName || "Client ManyChat",
    platform: normalizePlatform(readFirst(payload.platform, payload.channel, contact.channel, "facebook")),
    avatarUrl: readFirst(payload.avatar_url, payload.profile_pic, payload.profile_pic_url, contact.avatar_url, contact.profile_pic, contact.profile_pic_url),
    metaUrl: readFirst(payload.meta_url, payload.inbox_url, payload.live_chat_url, payload.profile_url, contact.meta_url, contact.inbox_url, contact.live_chat_url),
    email: readFirst(payload.email, contact.email),
    phone: readFirst(payload.phone, payload.phone_number, contact.phone, contact.phone_number),
    text: readFirst(payload.last_input_text, payload.message_text, payload.message, payload.text, payload.input, payload.body, payload.message?.text, contact.last_input_text),
    externalMessageId: readFirst(payload.message_id, payload.mid, payload.external_id, payload.message?.id),
    messageAt: normalizeDate(readFirst(payload.message_at, payload.created_at, payload.last_interaction, contact.last_interaction)),
    raw: payload
  };
}

async function upsertManyChatLead(supabase, message, organization) {
  const now = new Date().toISOString();
  const organizationId = organization?.id || "";
  const existing = await findExistingLead(supabase, message, organizationId);

  if (existing) {
    const wasArchived = Boolean(existing.archived_at);
    const { data: reactivatedStage } = wasArchived
      ? await scopedMaybeSingle(supabase.from("stages").select("id").eq("code", "reactivated"), organizationId)
      : { data: null };

    const updatePayload = removeUndefined({
      organization_id: organizationId || undefined,
      meta_contact_id: message.metaContactId || undefined,
      manychat_id: message.manyChatId || undefined,
      name: chooseName(existing.name, message.name),
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
    });
    const { data, error } = await saveLeadMutationWithFallback(() => supabase
      .from("leads")
      .update(updatePayload)
      .eq("id", existing.id)
      .select("id, name, platform")
      .single(), updatePayload);

    if (error) throw error;
    await insertIncomingMessage(supabase, existing.id, message);
    await insertActivity(supabase, existing.id, wasArchived ? "reactivated_by_message" : "incoming_message", {
      source: "manychat",
      manyChatId: message.manyChatId || null
    });
    return data;
  }

  const { data: stage } = await scopedMaybeSingle(supabase.from("stages").select("id").eq("code", "new"), organizationId);
  const insertPayload = {
      organization_id: organizationId || null,
      meta_contact_id: message.metaContactId,
      manychat_id: message.manyChatId || null,
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
    };
  const { data, error } = await saveLeadMutationWithFallback(() => supabase
    .from("leads")
    .insert(insertPayload)
    .select("id, name, platform")
    .single(), insertPayload);

  if (error) throw error;
  await insertIncomingMessage(supabase, data.id, message);
  await insertActivity(supabase, data.id, "incoming_message", {
    source: "manychat",
    created: true,
    manyChatId: message.manyChatId || null
  });
  return data;
}

async function findExistingLead(supabase, message, organizationId = "") {
  const idVariants = contactIdVariants(message.metaContactId);
  if (idVariants.length) {
    const { data, error } = await scopedLeadLookup(
      buildLeadLookupQuery(supabase, organizationId).in("meta_contact_id", idVariants),
      () => buildLeadLookupQuery(supabase, "", false).in("meta_contact_id", idVariants)
    );

    if (error) throw error;
    if (data?.[0]) return data[0];
  }

  if (message.email) {
    const emailFilter = `customer_email.eq.${message.email},email.eq.${message.email},meta_email.eq.${message.email}`;
    const { data, error } = await scopedLeadLookup(
      buildLeadLookupQuery(supabase, organizationId).or(emailFilter),
      () => buildLeadLookupQuery(supabase, "", false).or(emailFilter)
    );

    if (error) throw error;
    if (data?.[0]) return data[0];
  }

  if (message.phone) {
    const { data, error } = await scopedLeadLookup(
      buildLeadLookupQuery(supabase, organizationId).eq("phone", message.phone),
      () => buildLeadLookupQuery(supabase, "", false).eq("phone", message.phone)
    );

    if (error) throw error;
    if (data?.[0]) return data[0];
  }

  if (message.name) {
    const { data, error } = await scopedLeadLookup(
      buildLeadLookupQuery(supabase, organizationId).eq("platform", message.platform).ilike("name", message.name),
      () => buildLeadLookupQuery(supabase, "", false).eq("platform", message.platform).ilike("name", message.name)
    );

    if (error) throw error;
    if (data?.[0]) return data[0];
  }

  return null;
}

function buildLeadLookupQuery(supabase, organizationId, includeOrganization = true) {
  const columns = includeOrganization
    ? "id, name, avatar_url, meta_contact_id, meta_email, meta_url, meta_url_verified, archived_at, organization_id"
    : "id, name, avatar_url, meta_contact_id, meta_email, meta_url, meta_url_verified, archived_at";
  let query = supabase
    .from("leads")
    .select(columns)
    .order("created_at", { ascending: true })
    .limit(1);
  if (organizationId) query = query.eq("organization_id", organizationId);
  return query;
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

function chooseName(existingName, incomingName) {
  if (!incomingName || isBrokenPlaceholder(incomingName)) return existingName || "Client ManyChat";
  return incomingName;
}

function isBrokenPlaceholder(value) {
  const compact = String(value || "").replace(/\s/g, "");
  return compact.length > 0 && /^[?]+$/.test(compact);
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

async function saveLeadMutationWithFallback(action, payload) {
  let result = await action();
  let changed = true;
  while (result.error && changed) {
    changed = false;
    if (isMissingManyChatColumnError(result.error) && "manychat_id" in payload) {
      delete payload.manychat_id;
      result = await action();
      changed = true;
    }
    if (isMissingOrganizationColumnError(result.error) && "organization_id" in payload) {
      delete payload.organization_id;
      result = await action();
      changed = true;
    }
  }
  return result;
}

function isMissingManyChatColumnError(error) {
  return error?.code === "PGRST204" && /manychat_id/i.test(error?.message || "");
}

function isMissingOrganizationColumnError(error) {
  return error?.code === "PGRST204" && /organization_id|schema cache/i.test(error?.message || "");
}

async function resolveOrganization(supabase, message) {
  const pageId = String(message.pageId || "").trim();
  if (pageId) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .or(`manychat_page_id.eq.${pageId},meta_page_id.eq.${pageId}`)
      .eq("active", true)
      .maybeSingle();
    if (!error && data) return data;
    if (error && !isMissingOrganizationTableError(error)) throw error;
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", "dovi-crm")
    .maybeSingle();
  if (!error) return data || null;
  if (isMissingOrganizationTableError(error)) return null;
  throw error;
}

function isMissingOrganizationTableError(error) {
  return error?.code === "42P01" || /organizations|schema cache|does not exist/i.test(error?.message || "");
}

async function scopedLeadLookup(query, fallback) {
  const result = await query;
  if (!result.error) return result;
  if (isMissingOrganizationColumnError(result.error)) return fallback();
  return result;
}

async function scopedMaybeSingle(query, organizationId) {
  let scoped = query;
  if (organizationId) scoped = scoped.eq("organization_id", organizationId);
  const result = await scoped.maybeSingle();
  if (!result.error) return result;
  if (organizationId && isMissingOrganizationColumnError(result.error)) return query.maybeSingle();
  return result;
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
  if (!message.manyChatId || !message.text) return "";
  const stamp = message.messageAt || "";
  return `manychat:${message.manyChatId}:${stamp}:${hashText(message.text)}`;
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
