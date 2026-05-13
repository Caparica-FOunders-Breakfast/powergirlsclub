// Supabase Edge Function: analyze-workout-image
// Accepts a base64 image, validates the user session, enforces a per-user
// daily rate limit, calls Anthropic Claude Vision to extract exercises, then
// logs the call for telemetry. The ANTHROPIC_API_KEY only ever lives here
// — never in the frontend bundle.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const DAILY_LIMIT = 5;
// Fixed estimate per image, matches the figure used by the admin dashboard.
const COST_PER_IMAGE_USD = 0.005;
const FEATURE = "workout_image_import";

const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const PROMPT =
  "Extract all exercises from this workout plan image. Return ONLY a JSON array with this format: [{name, sets, reps, weight, unit, progression, notes}]. If you cannot read something clearly, make your best guess. Return nothing except the JSON array.";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// Strip the leading "data:image/png;base64," if the client included one and
// return the detected media type + raw base64 payload.
const parseImage = (input: string): { media: string; data: string } | null => {
  if (!input) return null;
  const match = input.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (match) {
    const media = match[1].toLowerCase();
    if (!ALLOWED_MIME.has(media)) return null;
    return { media, data: match[2] };
  }
  // Raw base64 with no prefix — default to jpeg.
  return { media: "image/jpeg", data: input };
};

const extractJsonArray = (text: string): unknown[] | null => {
  const trimmed = text.trim();
  // The model sometimes wraps the array in ```json ... ``` fences despite the
  // "return nothing else" instruction — strip them defensively.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    const parsed = JSON.parse(candidate);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    // Try to find the first [...] block in the response.
    const start = candidate.indexOf("[");
    const end = candidate.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      const parsed = JSON.parse(candidate.slice(start, end + 1));
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
    console.error("analyze-workout-image: missing Supabase env");
    return json({ error: "Server misconfigured" }, 500);
  }
  if (!ANTHROPIC_API_KEY) {
    console.error("analyze-workout-image: missing ANTHROPIC_API_KEY");
    return json({ error: "AI service is not configured" }, 500);
  }

  // 1) Verify the caller is a real, signed-in user.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Not authenticated" }, 401);
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: "Not authenticated" }, 401);
  }
  const userId = userData.user.id;

  // The service-role client bypasses RLS so we can read settings + write logs
  // even from a user context.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 2) Honor the global kill switch.
  const { data: settingRow } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "ai_import_enabled")
    .maybeSingle();
  // Default to enabled if the row hasn't been seeded yet.
  const enabled = settingRow?.value !== false;
  if (!enabled) {
    return json({ error: "AI import is temporarily unavailable" }, 503);
  }

  // 3) Per-user rate limit: count today's calls for this feature.
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count, error: countError } = await admin
    .from("api_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", FEATURE)
    .gte("created_at", startOfDay.toISOString());
  if (countError) {
    console.error("analyze-workout-image: rate-limit query failed", countError);
    return json({ error: "Couldn't verify rate limit. Please try again." }, 500);
  }
  if ((count ?? 0) >= DAILY_LIMIT) {
    return json(
      { error: "You have reached your daily limit of 5 imports. Come back tomorrow!" },
      429,
    );
  }

  // 4) Parse + validate the image payload.
  let body: { image?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }
  const parsed = parseImage(body.image ?? "");
  if (!parsed) {
    return json({ error: "Missing or unsupported image (jpeg/png/webp/gif)" }, 400);
  }
  // Anthropic caps images at ~5MB. Decoded size ≈ base64 length * 0.75.
  if (parsed.data.length * 0.75 > 5 * 1024 * 1024) {
    return json({ error: "Image is too large (max ~5MB)" }, 413);
  }

  // 5) Call Anthropic Claude Vision.
  let anthropicRes: Response;
  try {
    anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: parsed.media, data: parsed.data },
              },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      }),
    });
  } catch (e) {
    console.error("analyze-workout-image: Anthropic fetch failed", e);
    return json({ error: "AI service is unreachable" }, 502);
  }

  if (!anthropicRes.ok) {
    const text = await anthropicRes.text().catch(() => "");
    console.error("analyze-workout-image: Anthropic error", anthropicRes.status, text);
    if (anthropicRes.status === 429) {
      return json({ error: "AI service is rate-limited. Please try again shortly." }, 429);
    }
    return json({ error: "AI reading failed" }, 502);
  }

  const aiData = await anthropicRes.json();
  const textBlock = (aiData?.content ?? []).find((b: any) => b?.type === "text");
  const exercises = extractJsonArray(textBlock?.text ?? "");
  if (!exercises) {
    console.error("analyze-workout-image: model returned non-JSON", textBlock?.text);
    return json({ error: "AI reading failed" }, 502);
  }

  const tokensUsed =
    (aiData?.usage?.input_tokens ?? 0) + (aiData?.usage?.output_tokens ?? 0);

  // 6) Log the call (best-effort; we don't fail the request if logging fails).
  const { error: logError } = await admin.from("api_usage_logs").insert({
    user_id: userId,
    feature: FEATURE,
    tokens_used: tokensUsed,
    cost_estimate: COST_PER_IMAGE_USD,
  });
  if (logError) {
    console.error("analyze-workout-image: usage log insert failed", logError);
  }

  return json({ exercises });
});
