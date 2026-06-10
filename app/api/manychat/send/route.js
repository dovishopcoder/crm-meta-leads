import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const manyChatApiKey = process.env.MANYCHAT_API_KEY;
const manyChatSendEndpoint = process.env.MANYCHAT_SEND_ENDPOINT || "https://api.manychat.com/fb/sending/sendContent";
const metaPageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
const metaGraphVersion = process.env.META_GRAPH_VERSION || "v21.0";
const attachmentsBucket = process.env.MESSAGE_ATTACHMENTS_BUCKET || "crm-message-attachments";
const maxImageSize = 8 * 1024 * 1024;

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
    if (!manyChatApiKey && !metaPageAccessToken) {
      return NextResponse.json({ error: "Puntea de mesaje nu este configurata pe server." }, { status: 500 });
    }

    const token = getBearerToken(request);
    if (!token) return NextResponse.json({ error: "Sesiunea lipseste." }, { status: 401 });

    const supabase = serverSupabase();
    const manager = await requireActiveManager(token, supabase);
    const body = await readRequestBody(request);
    const leadId = String(body.leadId || "").trim();
    const text = String(body.text || "").trim();
    const imageFile = body.image || null;
    const requestedOrganizationId = String(body.organizationId || "").trim();

    if (!leadId) return NextResponse.json({ error: "Lead-ul lipseste." }, { status: 400 });
    if (!text && !imageFile) return NextResponse.json({ error: "Scrie mesajul sau alege o poza inainte de trimitere." }, { status: 400 });
    if (text.length > 2000) return NextResponse.json({ error: "Mesajul este prea lung." }, { status: 400 });
    if (imageFile) validateImageFile(imageFile);

    const organizationId = isGlobalAdmin(manager) && requestedOrganizationId ? requestedOrganizationId : manager.organization_id || "";
    const lead = await loadLeadForSending(supabase, leadId, organizationId);
    const subscriberId = lead.manychat_id || normalizeManyChatId(lead.meta_contact_id);
    const metaRecipientId = normalizeMetaContactId(lead.meta_contact_id);
    const canSendManyChat = Boolean(subscriberId && (lead.manychat_id || String(lead.meta_contact_id || "").startsWith("manychat:")) && manyChatApiKey);
    const canSendMeta = Boolean(metaRecipientId && metaPageAccessToken);

    if (!canSendManyChat && !canSendMeta) {
      return NextResponse.json({ error: "Acest lead nu are o punte activa pentru trimitere." }, { status: 400 });
    }

    const organizationApiKey = lead.organizations?.manychat_api_key || "";
    const organizationSendEndpoint = lead.organizations?.manychat_send_endpoint || "";
    const effectiveApiKey = organizationApiKey || manyChatApiKey;
    const effectiveSendEndpoint = organizationSendEndpoint || manyChatSendEndpoint;

    const imageUrl = imageFile ? await uploadMessageImage(supabase, lead.id, imageFile) : "";
    const messages = [];
    if (imageUrl) messages.push({ type: "image", url: imageUrl, buttons: [] });
    if (text) messages.push({ type: "text", text });
    const storedBody = buildStoredMessageBody(text, imageUrl);

    let externalMessageId = "";

    if (canSendManyChat) {
      const manyChatPayload = {
        subscriber_id: String(subscriberId),
        data: {
          version: "v2",
          content: {
            messages,
            actions: [],
            quick_replies: []
          }
        }
      };

      const manyChatResponse = await fetch(effectiveSendEndpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${effectiveApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(manyChatPayload)
      });

      const responseText = await manyChatResponse.text();
      const responsePayload = parseJson(responseText);

      if (!manyChatResponse.ok || responsePayload?.status === "error") {
        const message = manyChatErrorMessage(manyChatResponse.status, responsePayload, responseText);
        await safeInsertOutgoingMessage(supabase, lead.id, manager.id, storedBody, "failed", "", message);
        return jsonError(message, 400);
      }

      externalMessageId = responsePayload?.data?.message_id || responsePayload?.message_id || "";
    } else {
      const metaResult = await sendMetaMessages(metaRecipientId, text, imageUrl);
      if (!metaResult.ok) {
        await safeInsertOutgoingMessage(supabase, lead.id, manager.id, storedBody, "failed", "", metaResult.error);
        return jsonError(metaResult.error, 400);
      }
      externalMessageId = metaResult.messageId || "";
    }

    const savedMessage = await insertOutgoingMessage(
      supabase,
      lead.id,
      manager.id,
      storedBody,
      "sent",
      externalMessageId,
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

async function readRequestBody(request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const image = formData.get("image");
    return {
      leadId: formData.get("leadId") || "",
      text: formData.get("text") || "",
      organizationId: formData.get("organizationId") || "",
      image: image instanceof File && image.size > 0 ? image : null
    };
  }

  return request.json();
}

function validateImageFile(file) {
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/gif"]);
  if (!allowedTypes.has(file.type)) {
    throw new Error("Poza trebuie sa fie JPG, PNG sau GIF.");
  }
  if (file.size > maxImageSize) {
    throw new Error("Poza este prea mare. Limita este 8 MB.");
  }
}

async function uploadMessageImage(supabase, leadId, file) {
  await ensureAttachmentsBucket(supabase);
  const extension = imageExtension(file);
  const safeLeadId = String(leadId).replace(/[^a-zA-Z0-9-]/g, "");
  const path = `${safeLeadId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(attachmentsBucket).upload(path, bytes, {
    contentType: file.type,
    upsert: false
  });
  if (error) throw error;

  const { data } = supabase.storage.from(attachmentsBucket).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Poza a fost incarcata, dar URL-ul public lipseste.");
  return data.publicUrl;
}

async function ensureAttachmentsBucket(supabase) {
  const { data, error } = await supabase.storage.getBucket(attachmentsBucket);
  if (!error && data) return;
  const { error: createError } = await supabase.storage.createBucket(attachmentsBucket, {
    public: true,
    fileSizeLimit: maxImageSize,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif"]
  });
  if (createError && !/already exists/i.test(createError.message || "")) throw createError;
}

function imageExtension(file) {
  const byType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif"
  };
  return byType[file.type] || "jpg";
}

function buildStoredMessageBody(text, imageUrl) {
  if (!imageUrl) return text;
  return `[image] ${imageUrl}${text ? `\n${text}` : ""}`;
}

async function requireActiveManager(token, supabase) {
  const authClient = publicSupabase();
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user?.email) throw new Error("Sesiunea nu este valida.");

  let { data: manager, error } = await supabase
    .from("managers")
    .select("id, name, email, role, active, organization_id, organizations(slug)")
    .eq("email", userData.user.email)
    .maybeSingle();

  if (error && isMissingOrganizationColumnError(error)) {
    const fallback = await supabase
      .from("managers")
      .select("id, name, email, role, active")
      .eq("email", userData.user.email)
      .maybeSingle();
    manager = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  if (!manager?.active) throw new Error("Contul logat nu este manager activ.");
  return { ...manager, code: managerNameToCode(manager.name) };
}

async function loadLeadForSending(supabase, leadId, organizationId = "") {
  let query = supabase
    .from("leads")
    .select("id, meta_contact_id, manychat_id, organization_id, organizations(manychat_api_key, manychat_send_endpoint)")
    .eq("id", leadId);
  if (organizationId) query = query.eq("organization_id", organizationId);
  let { data, error } = await query.maybeSingle();

  if (error && (isMissingManyChatColumnError(error) || isMissingOrganizationColumnError(error))) {
    let fallbackQuery = supabase
      .from("leads")
      .select("id, meta_contact_id")
      .eq("id", leadId);
    const fallback = await fallbackQuery.maybeSingle();
    data = fallback.data ? { ...fallback.data, manychat_id: "" } : null;
    error = fallback.error;
  }

  if (error && organizationId && isMissingOrganizationColumnError(error)) {
    const fallback = await supabase
      .from("leads")
      .select("id, meta_contact_id, manychat_id")
      .eq("id", leadId)
      .maybeSingle();
    data = fallback.data;
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

async function sendMetaMessages(recipientId, text, imageUrl) {
  const sentIds = [];

  if (imageUrl) {
    const imageResult = await sendMetaPayload({
      recipient: { id: String(recipientId) },
      message: {
        attachment: {
          type: "image",
          payload: { url: imageUrl, is_reusable: true }
        }
      }
    });
    if (!imageResult.ok) return imageResult;
    if (imageResult.messageId) sentIds.push(imageResult.messageId);
  }

  if (text) {
    const textResult = await sendMetaPayload({
      recipient: { id: String(recipientId) },
      message: { text }
    });
    if (!textResult.ok) return textResult;
    if (textResult.messageId) sentIds.push(textResult.messageId);
  }

  return { ok: true, messageId: sentIds.filter(Boolean).join(",") };
}

async function sendMetaPayload(payload) {
  const url = new URL(`https://graph.facebook.com/${metaGraphVersion}/me/messages`);
  url.searchParams.set("access_token", metaPageAccessToken);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();
  const responsePayload = parseJson(responseText);

  if (!response.ok || responsePayload?.error) {
    return {
      ok: false,
      error: metaErrorMessage(response.status, responsePayload, responseText)
    };
  }

  return {
    ok: true,
    messageId: responsePayload?.message_id || ""
  };
}

function metaErrorMessage(status, payload, text) {
  const message = payload?.error?.message || payload?.message || payload?.error;
  if (message) {
    return `Meta a refuzat mesajul: ${message}`;
  }

  const cleanText = String(text || "").replace(/\s+/g, " ").trim();
  if (cleanText.startsWith("<!DOCTYPE") || cleanText.startsWith("<html")) {
    return `Meta nu a raspuns corect. Status: ${status}. Verifica tokenul paginii si permisiunea pages_messaging.`;
  }

  return `Meta nu a acceptat mesajul. Status: ${status}${cleanText ? `: ${cleanText.slice(0, 180)}` : ""}`;
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

function normalizeMetaContactId(value) {
  const id = String(value || "").trim();
  if (!id || /^manychat:/i.test(id) || /^user:/i.test(id)) return "";
  return id;
}

function isGlobalAdmin(manager) {
  if (manager?.role !== "admin") return false;
  const configuredEmails = String(process.env.GLOBAL_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (configuredEmails.length) return configuredEmails.includes(String(manager.email || "").toLowerCase());
  return manager.organizations?.slug === "dovi-crm";
}

function managerNameToCode(name) {
  return String(name || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unassigned";
}

function isMissingManyChatColumnError(error) {
  return error?.code === "PGRST204" && /manychat_id/i.test(error?.message || "");
}

function isMissingOrganizationColumnError(error) {
  return error?.code === "PGRST204" && /organization_id|organizations|schema cache/i.test(error?.message || "");
}
