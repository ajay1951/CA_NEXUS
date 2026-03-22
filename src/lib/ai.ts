import { supabase } from "./supabase";

export async function generateAIContent(
  topic: string,
  platform: "linkedin" | "whatsapp"
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("generate-content", {
    body: { topic, platform },
  });

  if (error) {
    throw new Error(error.message || "Failed to generate content");
  }

  if (!data?.content) {
    throw new Error("No content returned from AI service");
  }

  return data.content as string;
}

