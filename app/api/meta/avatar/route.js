import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const src = searchParams.get("src");

  if (!src || !isAllowedAvatarUrl(src)) {
    return new Response("Bad avatar URL", { status: 400 });
  }

  try {
    const response = await fetch(src, { redirect: "follow" });
    if (!response.ok) {
      return new Response("Avatar not found", { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const body = await response.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch {
    return new Response("Avatar fetch failed", { status: 502 });
  }
}

function isAllowedAvatarUrl(value) {
  try {
    const url = new URL(value);
    return [
      "platform-lookaside.fbsbx.com",
      "scontent.xx.fbcdn.net",
      "scontent.fkiv1-1.fna.fbcdn.net",
      "i.pravatar.cc"
    ].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}
