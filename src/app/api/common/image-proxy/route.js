import { corsHeaders } from "@/lib/cors";

const headersObj = typeof corsHeaders === "function" ? corsHeaders() : {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response("OK", { headers: headersObj });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return new Response("Missing url parameter", { status: 400 });
    }

    // Allow fetching from trusted domains or valid HTTP/HTTPS URLs
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return new Response("Invalid protocol", { status: 400 });
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent": "MediConnect-ImageProxy/1.0",
      },
    });

    if (!res.ok) {
      return new Response(`Upstream error: ${res.statusText}`, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "image/png";
    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        ...headersObj,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("Image proxy error:", err);
    return new Response("Failed to fetch image", { status: 500 });
  }
}
