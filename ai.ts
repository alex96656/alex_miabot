import OpenAI from "openai";
import { logger } from "../lib/logger";

const client = new OpenAI({
  apiKey: process.env["OPENROUTER_API_KEY"],
  baseURL: "https://openrouter.ai/api/v1",
});

// Free OpenRouter models — tried in order; falls through if one is rate-limited upstream
const FREE_MODELS = [
  "nvidia/nemotron-nano-9b-v2:free",
  "openai/gpt-oss-20b:free",
  "google/gemma-4-26b-a4b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "openai/gpt-oss-120b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "meta-llama/llama-3.2-3b-instruct:free",
];

function stripWrappingQuotes(text: string): string {
  let result = text.trim();
  while (
    result.length >= 2 &&
    ((result.startsWith('"') && result.endsWith('"')) ||
      (result.startsWith("“") && result.endsWith("”")) ||
      (result.startsWith("'") && result.endsWith("'")))
  ) {
    result = result.slice(1, -1).trim();
  }
  return result;
}

async function tryModel(
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<string | null> {
  const response = await client.chat.completions.create({
    model,
    messages,
    max_tokens: 1024,
  });
  const text = response.choices[0]?.message?.content?.trim();
  return text ? stripWrappingQuotes(text) : null;
}

async function createWithFallback(
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<string | null> {
  for (const model of FREE_MODELS) {
    try {
      const text = await tryModel(model, messages);
      if (text) return text;
    } catch (err) {
      const msg = (err as Error).message ?? "";
      const isRateLimited = msg.includes("429") || msg.includes("rate-limited");
      const isNotFound = msg.includes("404");
      if (isRateLimited || isNotFound) {
        logger.warn({ model }, "Free model unavailable, trying next");
        continue;
      }
      logger.error({ err, model }, "OpenRouter error");
      continue;
    }
  }
  return null;
}

export async function chatWithAI(
  userMessage: string,
  systemPrompt?: string
): Promise<string> {
  const result = await createWithFallback([
    {
      role: "system",
      content:
        systemPrompt ||
        "You are AleX Bot, a helpful and friendly Telegram assistant. Be concise and helpful. Keep responses under 300 words unless asked for detail.",
    },
    { role: "user", content: userMessage },
  ]);
  return result ?? "⚠️ AI is unavailable right now. Try again later.";
}

export async function chatWithAIHistory(
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  systemInstruction: string
): Promise<string | null> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemInstruction },
    ...history.map((h) => ({
      role: (h.role === "model" ? "assistant" : "user") as "user" | "assistant",
      content: h.parts.map((p) => p.text).join(""),
    })),
  ];
  return createWithFallback(messages);
}

export async function generateImageBase64(
  _prompt: string
): Promise<{ b64: string; mime: string } | null> {
  logger.warn("Image generation is not available via OpenRouter free models");
  return null;
}

export async function translateText(text: string, targetLang: string): Promise<string> {
  return chatWithAI(
    `Translate the following text to ${targetLang}. Reply ONLY with the translation, nothing else:\n\n${text}`,
    "You are a professional translator."
  );
}

export async function summarizeText(text: string): Promise<string> {
  return chatWithAI(
    `Summarize the following text in 3-5 bullet points:\n\n${text}`,
    "You are a summarization assistant. Be concise and clear."
  );
}
