/**
 * CA Nexus Hub - AI Content Generation Function
 *
 * Uses OpenAI server-side. API key never reaches client.
 * Deploy: supabase functions deploy generate-content
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface GenerateRequest {
  topic: string;
  platform: "linkedin" | "whatsapp";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "No authorization" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return json({ error: "Invalid token" }, 401);
    }

    const { topic, platform }: GenerateRequest = await req.json();
    if (!topic?.trim() || (platform !== "linkedin" && platform !== "whatsapp")) {
      return json({ error: "Invalid request body" }, 400);
    }

    if (!OPENAI_API_KEY) {
      return json({ error: "OPENAI_API_KEY is not configured" }, 500);
    }

    const stylePrompt =
      platform === "linkedin"
        ? "Write a polished LinkedIn post for Indian CA professionals. Include a hook, 3-5 practical points, and relevant hashtags."
        : "Write a concise WhatsApp outreach message for a CA audience. Keep it short, clear, and actionable.";

    const prompt = `${stylePrompt}\n\nTopic: ${topic.trim()}\n\nConstraints: professional tone, no fake claims, plain text only.`;

    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: prompt,
        max_output_tokens: 450,
      }),
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      console.error("OpenAI error:", err);
      return json({ error: "AI generation failed" }, 502);
    }

    const aiData = await aiResponse.json();
    const content = extractText(aiData);

    if (!content) {
      return json({ error: "No content generated" }, 502);
    }

    return json({ content });
  } catch (error) {
    console.error("generate-content error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});

function extractText(payload: any): string {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const output = payload?.output;
  if (!Array.isArray(output)) return "";

  const textParts: string[] = [];
  for (const item of output) {
    const content = item?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const txt = part?.text;
      if (typeof txt === "string" && txt.trim()) textParts.push(txt.trim());
    }
  }
  return textParts.join("\n\n").trim();
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

