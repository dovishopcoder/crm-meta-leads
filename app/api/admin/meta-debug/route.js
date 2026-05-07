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

export async function GET(request) {
  try {
    const token = getBearerToken(request);
    if (!token) return NextResponse.json({ error: "Sesiunea admin lipseste." }, { status: 401 });
    if (!pageAccessToken) return NextResponse.json({ error: "META_PAGE_ACCESS_TOKEN lipseste pe server." }, { status: 500 });

    const supabase = serverSupabase();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user?.email) {
      return NextResponse.json({ error: "Sesiunea admin nu este valida." }, { status: 401 });
    }

    const { data: adminManager, error: adminError } = await supabase
      .from("managers")
      .select("role, active")
      .eq("email", userData.user.email)
      .maybeSingle();

    if (adminError) throw adminError;
    if (adminManager?.role !== "admin" || !adminManager.active) {
      return NextResponse.json({ error: "Doar adminul poate folosi debug Meta." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get("pageId") || "";
    const contactId = searchParams.get("contactId") || "";
    if (!pageId || !contactId) {
      return NextResponse.json({ error: "Lipsesc pageId sau contactId." }, { status: 400 });
    }

    const direct = await graph(`${pageId}/conversations`, {
      fields: "id,link,participants,updated_time",
      user_id: contactId,
      limit: "10"
    });

    const listed = await graph(`${pageId}/conversations`, {
      fields: "id,link,participants,updated_time",
      limit: "25"
    });

    const allConversations = [...(direct.data?.data || []), ...(listed.data?.data || [])];
    const uniqueConversations = Array.from(new Map(allConversations.map((item) => [item.id, item])).values());
    const matches = uniqueConversations
      .map((conversation) => ({
        ...conversation,
        clientParticipant: findClientParticipant(conversation.participants?.data || [], contactId, pageId)
      }))
      .filter((conversation) => conversation.clientParticipant);

    const links = matches.flatMap((conversation) => {
      const participantId = conversation.clientParticipant?.id;
      return [
        {
          label: "conversation.id",
          selectedItemId: conversation.id,
          url: buildMetaConversationUrl(pageId, conversation.id)
        },
        participantId ? {
          label: "participant.id",
          selectedItemId: participantId,
          url: buildMetaConversationUrl(pageId, participantId)
        } : null
      ].filter(Boolean);
    });

    return NextResponse.json({
      ok: true,
      graphVersion,
      pageId,
      contactId,
      directStatus: direct.status,
      directError: direct.data?.error || null,
      listedStatus: listed.status,
      listedError: listed.data?.error || null,
      matches: matches.map((conversation) => ({
        id: conversation.id,
        link: conversation.link || null,
        updatedTime: conversation.updated_time || null,
        participants: (conversation.participants?.data || []).map((participant) => ({
          id: participant.id || null,
          name: participant.name || null,
          email: participant.email || null
        })),
        clientParticipant: conversation.clientParticipant ? {
          id: conversation.clientParticipant.id || null,
          name: conversation.clientParticipant.name || null,
          email: conversation.clientParticipant.email || null
        } : null
      })),
      links
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Debug Meta a esuat." }, { status: 500 });
  }
}

async function graph(path, params) {
  const url = new URL(`https://graph.facebook.com/${graphVersion}/${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("access_token", pageAccessToken);

  const response = await fetch(url);
  const data = await response.json();
  return { status: response.status, data };
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

function buildMetaConversationUrl(pageId, selectedItemId) {
  const url = new URL("https://business.facebook.com/latest/inbox/all");
  url.searchParams.set("asset_id", pageId);
  url.searchParams.set("mailbox_id", pageId);
  url.searchParams.set("selected_item_id", selectedItemId);
  url.searchParams.set("thread_type", "FB_MESSAGE");
  return url.toString();
}

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}
