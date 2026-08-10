import { supabase, openai } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CATEGORY_URLS = {
  "Public Health": "https://www.who.int",
  "Research": "https://www.nih.gov",
  "Nutrition": "https://www.nutrition.gov",
  "Fitness": "https://www.healthline.com/nutrition/category/fitness",
  "Mental Health": "https://www.nimh.nih.gov",
  "Policy": "https://www.who.int/news-room",
  "Technology": "https://www.digitalhealth.net",
  "Other": "https://www.mayoclinic.org",
  "General": "https://www.mayoclinic.org"
};

function getCorsHeadersSafe() {
  try {
    return typeof corsHeaders === "function" ? corsHeaders() : corsHeaders;
  } catch {
    return {};
  }
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeadersSafe(),
    },
  });
}

function utcTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function shuffleInPlace(items) {
  for (let index = items.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function stripJsonFences(text) {
  if (!text) return "";
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function parseJsonStrict(text) {
  const cleaned = stripJsonFences(text);
  return JSON.parse(cleaned);
}

function normalizeAiItem(item) {
  const title = String(item?.title || "").trim();
  const summary = String(item?.summary || "").trim();
  const content = String(item?.content || "").trim();
  const category = item?.category ? String(item.category).trim() : null;
  const source = item?.source ? String(item.source).trim() : "AI";
  const url = item?.url ? String(item.url).trim() : null;

  if (!title || !summary) return null;

  return {
    title,
    summary,
    content: content || summary,
    category,
    source,
    url,
  };
}

async function generateAiMedicalBriefings({ totalCount, date }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set on the server.");
  }

  // Generating 100 items in a single completion can produce malformed JSON.
  // We generate in smaller batches and force JSON output.
  const items = [];
  const seenTitles = new Set();
  let attempts = 0;

  while (items.length < totalCount && attempts < 10) {
    attempts += 1;
    const remaining = totalCount - items.length;
    const batchCount = Math.min(25, remaining);

    const prompt = `Create exactly ${batchCount} unique medical-related daily briefings for date ${date}.

Constraints:
- These are AI-written briefings (NOT real-time publisher news).
- Do NOT claim you browsed the internet, and do NOT cite real publishers.
- Keep it medically responsible. Focus on:
  1. Latest health trends & wellness tips.
  2. Explainers for common medical conditions.
  3. Updates on public health guidelines.
  4. Nutrition and lifestyle advice.
- Avoid diagnosing individuals; avoid naming real persons.
- **Tone**: Engaging, informative, and professional. Make it interesting for a general audience.

Output JSON ONLY with this exact shape:
{"items":[{"title":"...","summary":"...","content":"...","category":"Public Health|Research|Nutrition|Fitness|Mental Health|Policy|Technology|Other","source":"AI","url":null}]}

Rules:
- title: Catchy and clear (8-15 words).
- summary: Short preview (2-3 sentences) for the card display.
- content: Detailed article body (150-250 words). MUST include:
  * 2-3 sub-headings using markdown ## format
  * Bullet points using markdown - format under each sub-heading
  * At least one "Key Takeaways" or "What You Can Do" section
  * End with a brief concluding thought
  Example content format:
  "## Understanding the Condition\n- Point one about the topic\n- Point two explaining details\n\n## Key Takeaways\n- Actionable advice one\n- Actionable advice two\n\nStay informed and consult your doctor for personalized guidance."
- category must be one of: Public Health, Research, Nutrition, Fitness, Mental Health, Policy, Technology, Other.
- source must be "AI".
- url must be null.
- Make titles different inside this batch (attempt ${attempts}).`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You write medically responsible content. Return ONLY a valid JSON object.",
        },
        { role: "user", content: prompt },
      ],
      // Enforce valid JSON output to prevent parse errors
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = completion.choices?.[0]?.message?.content;
    let parsed;
    try {
      parsed = parseJsonStrict(content);
    } catch (error) {
      // If something went wrong despite response_format, retry.
      console.error("OpenAI JSON parse failed:", error);
      continue;
    }

    const batchItems = Array.isArray(parsed?.items) ? parsed.items : [];
    for (const raw of batchItems) {
      const normalized = normalizeAiItem(raw);
      if (!normalized) continue;
      if (seenTitles.has(normalized.title)) continue;
      seenTitles.add(normalized.title);
      items.push(normalized);
      if (items.length >= totalCount) break;
    }
  }

  if (items.length < totalCount) {
    throw new Error(
      `OpenAI generation produced only ${items.length}/${totalCount} valid unique items.`
    );
  }

  return items;
}

export async function OPTIONS() {
  return new Response("OK", { headers: getCorsHeadersSafe() });
}

// GET /api/medical-news
// Behavior:
// - Deletes any cached news older than today
// - If today has 0 rows, generates 100 AI medical briefings and stores them
// - Always returns 15 shuffled items for today
export async function GET() {
  const today = utcTodayDateString();

  try {
    // 1) Delete older than today (keep only today's cache)
    const { error: deleteError } = await supabase
      .from("daily_medical_news")
      .delete()
      .lt("news_date", today);
    if (deleteError) throw deleteError;

    // 2) Check if we already have today's 100 cached
    const { count, error: countError } = await supabase
      .from("daily_medical_news")
      .select("id", { count: "exact", head: true })
      .eq("news_date", today);

    if (countError) throw countError;

    const existingCount = count || 0;

    // 3) If none exist, generate 100 via OpenAI and store
    if (existingCount === 0) {
      const generated = await generateAiMedicalBriefings({
        totalCount: 20,
        date: today,
      });

      const rows = generated.map((item) => ({
        news_date: today,
        title: item.title,
        summary: item.summary,
        content: item.content || item.summary,
        category: item.category,
        source: item.source || "AI",
        url: item.url || null,
        is_ai_generated: true,
      }));

      const { error: insertError } = await supabase
        .from("daily_medical_news")
        .upsert(rows, { onConflict: "news_date,title" });

      if (insertError) throw insertError;
    }

    // 4) Fetch today's cache and return 15 shuffled
    const { data, error: fetchError } = await supabase
      .from("daily_medical_news")
      .select("id, news_date, title, summary, content, category, source, url, is_ai_generated, created_at")
      .eq("news_date", today);

    if (fetchError) throw fetchError;

    const allItems = Array.isArray(data) ? data : [];
    if (allItems.length === 0) {
      return jsonResponse(500, {
        success: false,
        message:
          "No medical news available for today (generation may have failed).",
        error: "empty_cache",
      });
    }

    const shuffled = shuffleInPlace([...allItems]);
    const selected = shuffled.slice(0, 15).map(item => {
      const category = item.category || "General";
      const mappedUrl = CATEGORY_URLS[category] || CATEGORY_URLS["General"];
      return {
        ...item,
        url: item.url || mappedUrl
      };
    });

    return jsonResponse(200, {
      success: true,
      message: "Medical news fetched successfully.",
      data: {
        date: today,
        totalForToday: allItems.length,
        items: selected,
        note:
          "These items are AI-generated daily medical briefings (not real-time publisher news).",
      },
    });
  } catch (error) {
    console.error("/api/medical-news error:", error);

    return jsonResponse(500, {
      success: false,
      message: "Failed to fetch medical news.",
      error: error?.message || "unknown_error",
    });
  }
}
