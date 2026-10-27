import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get("url");
    const requestedName = searchParams.get("name") || "document";

    if (!fileUrl) {
      return NextResponse.json({ error: "Missing document url" }, { status: 400 });
    }

    // Fetch the document
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch file: ${response.statusText}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const buffer = await response.arrayBuffer();

    // Determine clean file extension
    let ext = "";
    if (contentType.includes("pdf")) ext = ".pdf";
    else if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = ".jpg";
    else if (contentType.includes("png")) ext = ".png";
    else if (contentType.includes("webp")) ext = ".webp";
    else {
      const urlExtMatch = fileUrl.split("?")[0].match(/\.([a-zA-Z0-9]+)$/);
      if (urlExtMatch) ext = `.${urlExtMatch[1]}`;
    }

    const sanitizedBase = requestedName
      .replace(/[^a-zA-Z0-9_\-\s]/g, "")
      .trim()
      .replace(/\s+/g, "_");

    const finalFileName = sanitizedBase.endsWith(ext)
      ? sanitizedBase
      : `${sanitizedBase}${ext}`;

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(finalFileName)}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Error downloading document:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
