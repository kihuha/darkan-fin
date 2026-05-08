import "server-only";

import { GoogleGenAI, type Content } from "@google/genai";
import { z } from "zod";

import { ApiError } from "@/utils/errors";
import { logWarn } from "@/utils/server/logger";
import { getServerEnv } from "@/utils/server/env";

/**
 * Provider-agnostic LLM facade.
 *
 * Currently backed by Google Gemini (cheapest model: gemini-2.5-flash-lite).
 * The shapes of `ChatMessage`, `streamChatCompletion`, and
 * `generateStructuredJson` are intentionally provider-neutral so we can
 * swap providers later without touching call sites.
 */

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatStreamChunk =
  | { type: "text-delta"; delta: string }
  | { type: "source-url"; url: string; title?: string }
  | { type: "error"; errorText: string };

export type StreamChatOptions = {
  messages: ChatMessage[];
  system?: string;
  webSearch?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
};

export type StructuredJsonOptions<S extends z.ZodTypeAny> = {
  system?: string;
  prompt: string;
  schema: S;
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
};

const DEFAULT_TEXT_MODEL = "gemini-2.5-flash-lite";
const DEFAULT_STRUCTURED_MODEL = "gemini-2.5-flash-lite";

let cachedClient: GoogleGenAI | null = null;

function get_client(): GoogleGenAI {
  if (cachedClient) return cachedClient;

  const env = getServerEnv();
  const api_key = env.GEMINI_API_KEY;
  if (!api_key) {
    throw new ApiError(
      500,
      "INTERNAL_ERROR",
      "GEMINI_API_KEY is not configured",
    );
  }

  cachedClient = new GoogleGenAI({ apiKey: api_key });
  return cachedClient;
}

function get_text_model(): string {
  return getServerEnv().GEMINI_TEXT_MODEL ?? DEFAULT_TEXT_MODEL;
}

function get_structured_model(): string {
  return getServerEnv().GEMINI_STRUCTURED_MODEL ?? DEFAULT_STRUCTURED_MODEL;
}

function to_gemini_contents(messages: ChatMessage[]): Content[] {
  // Gemini supports `user` and `model` roles only; map assistant -> model.
  // System-style messages are folded into the systemInstruction by the caller.
  return messages
    .filter((m) => m.role !== "system" && m.content.length > 0)
    .map<Content>((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
}

function collect_system_text(
  messages: ChatMessage[],
  override?: string,
): string | undefined {
  const inline = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content.trim())
    .filter(Boolean)
    .join("\n\n");

  const combined = [override?.trim(), inline].filter(Boolean).join("\n\n");
  return combined.length > 0 ? combined : undefined;
}

/**
 * Stream a chat completion as provider-neutral chunks. Callers decide how to
 * forward chunks to the wire (e.g. SSE, websocket).
 */
export async function* streamChatCompletion(
  options: StreamChatOptions,
): AsyncGenerator<ChatStreamChunk, void, void> {
  const client = get_client();
  const model = get_text_model();
  const system = collect_system_text(options.messages, options.system);
  const contents = to_gemini_contents(options.messages);

  if (contents.length === 0) {
    yield {
      type: "error",
      errorText: "At least one user or assistant message is required",
    };
    return;
  }

  try {
    const stream = await client.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction: system,
        temperature: options.temperature ?? 0.6,
        maxOutputTokens: options.maxOutputTokens ?? 1024,
        abortSignal: options.signal,
        ...(options.webSearch
          ? { tools: [{ googleSearch: {} }] }
          : {}),
      },
    });

    const seen_sources = new Set<string>();

    for await (const chunk of stream) {
      const delta = chunk.text;
      if (delta && delta.length > 0) {
        yield { type: "text-delta", delta };
      }

      if (options.webSearch) {
        const grounding = chunk.candidates?.[0]?.groundingMetadata;
        const grounding_chunks = grounding?.groundingChunks;
        if (grounding_chunks) {
          for (const gc of grounding_chunks) {
            const url = gc.web?.uri;
            if (!url || seen_sources.has(url)) continue;
            seen_sources.add(url);
            yield {
              type: "source-url",
              url,
              title: gc.web?.title ?? gc.web?.domain ?? url,
            };
          }
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logWarn("llm.stream.failed", { message });
    yield { type: "error", errorText: "AI stream failed. Please try again." };
  }
}

// Keys to drop before sending the schema to Gemini.
// - JSON Schema metadata Gemini rejects: $schema, additionalProperties.
// - Numeric/string/array constraints: Gemini accepts these in principle but the
//   combinatorial state-space check rejects schemas with many bounded fields,
//   so we drop them here and re-validate strictly with Zod after parsing.
const DROPPED_SCHEMA_KEYS = new Set([
  "$schema",
  "additionalProperties",
  "minLength",
  "maxLength",
  "pattern",
  "format",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minItems",
  "maxItems",
  "uniqueItems",
  "minProperties",
  "maxProperties",
]);

function simplify_schema_for_gemini(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(simplify_schema_for_gemini);
  }
  if (node && typeof node === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (DROPPED_SCHEMA_KEYS.has(key)) continue;
      next[key] = simplify_schema_for_gemini(value);
    }
    return next;
  }
  return node;
}

function extract_json(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    // Strip ```json ... ``` fences if present.
    const stripped = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
    return stripped.trim();
  }
  return trimmed;
}

/**
 * Generate a strongly-typed JSON object that conforms to the supplied Zod
 * schema. Validation happens here so call sites get a parsed value.
 */
export async function generateStructuredJson<S extends z.ZodTypeAny>(
  options: StructuredJsonOptions<S>,
): Promise<z.infer<S>> {
  const client = get_client();
  const model = get_structured_model();

  const json_schema = simplify_schema_for_gemini(
    z.toJSONSchema(options.schema),
  );

  let raw_text: string | undefined;
  try {
    const result = await client.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [{ text: options.prompt }],
        },
      ],
      config: {
        systemInstruction: options.system,
        temperature: options.temperature ?? 0.4,
        maxOutputTokens: options.maxOutputTokens ?? 2048,
        responseMimeType: "application/json",
        responseJsonSchema: json_schema,
        abortSignal: options.signal,
      },
    });

    raw_text = result.text;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logWarn("llm.structured.failed", { message });
    throw new ApiError(
      502,
      "UPSTREAM_ERROR",
      "The AI is taking a break. Please try again in a moment.",
    );
  }

  if (!raw_text) {
    throw new ApiError(502, "UPSTREAM_ERROR", "AI returned an empty response");
  }

  let parsed_unknown: unknown;
  try {
    parsed_unknown = JSON.parse(extract_json(raw_text));
  } catch (error) {
    logWarn("llm.structured.invalid_json", {
      message: error instanceof Error ? error.message : String(error),
      preview: raw_text.slice(0, 200),
    });
    throw new ApiError(
      502,
      "UPSTREAM_ERROR",
      "AI returned malformed JSON. Please try again.",
    );
  }

  const validated = options.schema.safeParse(parsed_unknown);
  if (!validated.success) {
    logWarn("llm.structured.schema_mismatch", {
      issues: validated.error.issues,
    });
    throw new ApiError(
      502,
      "UPSTREAM_ERROR",
      "AI response did not match the expected shape. Please try again.",
    );
  }

  return validated.data;
}
