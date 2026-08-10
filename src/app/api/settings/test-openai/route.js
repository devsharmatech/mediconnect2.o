import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { apiKey, model = "gpt-4o-mini", maxTokens = 100, temperature = 0.7 } = await req.json();

    // Validate API key
    if (!apiKey) {
      return failure("OpenAI API key is required.", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    // Validate API key format
    const trimmedKey = apiKey.trim();
    if (!trimmedKey.startsWith('sk-')) {
      return failure("Invalid OpenAI API key format. API keys should start with 'sk-'.", "invalid_api_key", 400, {
        headers: corsHeaders,
      });
    }

    console.log(`Testing OpenAI API with model: ${model}`);

    // Dynamic import for OpenAI to avoid issues
    const { default: OpenAI } = await import('openai');

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: trimmedKey,
      timeout: 30000,
    });

    // Test the API with a simple completion
    const testCompletion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "You are a test assistant. Respond with '✅ Connection successful'."
        },
        {
          role: "user",
          content: "Test connection - please respond with a simple success message."
        }
      ],
      max_tokens: maxTokens,
      temperature: temperature,
    });

    const response = testCompletion.choices[0]?.message?.content;

    if (!response) {
      throw new Error("No response received from OpenAI API");
    }

    console.log(`OpenAI test successful. Response: ${response}`);

    return success("OpenAI connection test successful!", {
      model,
      response: response.trim(),
      tokensUsed: testCompletion.usage?.total_tokens || 0,
      timestamp: new Date().toISOString(),
    }, 200, {
      headers: corsHeaders,
    });

  } catch (err) {
    console.error("OpenAI test error:", err);

    // User-friendly error messages
    let errorMessage = "OpenAI connection test failed.";
    let errorCode = "openai_connection_failed";

    if (err.status === 401) {
      errorMessage = "Invalid API key. Please check your OpenAI API key.";
      errorCode = "invalid_api_key";
    } else if (err.status === 429) {
      errorMessage = "Rate limit exceeded. Please try again later.";
      errorCode = "rate_limit_exceeded";
    } else if (err.status === 404) {
      errorMessage = "Model not found. Please check the model name.";
      errorCode = "model_not_found";
    } else if (err.status === 403) {
      errorMessage = "Access forbidden. Check your API key permissions.";
      errorCode = "access_forbidden";
    } else if (err.code === "ENOTFOUND") {
      errorMessage = "Network error. Check your internet connection.";
      errorCode = "network_error";
    } else {
      errorMessage = `OpenAI test failed: ${err.message || "Unknown error"}`;
    }

    return failure(errorMessage, errorCode, 400, {
      headers: corsHeaders,
    });
  }
}