import type { UIMessage } from "ai";

import { ApiError } from "@/utils/errors";
import { withRouteContext } from "@/utils/route";
import { loadFamilyAIContext } from "@/utils/ai/context";
import { chat_system_prompt } from "@/utils/ai/prompts";
import {
  streamChatCompletion,
  type ChatMessage,
  type ChatStreamChunk,
} from "@/utils/ai/llm-client";

export const maxDuration = 30;

type ChatRequestBody = {
  messages: UIMessage[];
  webSearch?: boolean;
};

function ui_messages_to_chat(messages: UIMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const message of messages) {
    if (message.role === "system") continue;
    if (message.role !== "user" && message.role !== "assistant") continue;

    const text = (message.parts ?? [])
      .map((part) => {
        if (part && typeof part === "object" && "type" in part) {
          if (part.type === "text" && "text" in part && typeof part.text === "string") {
            return part.text;
          }
        }
        return "";
      })
      .join("\n")
      .trim();

    if (text.length === 0) continue;
    out.push({ role: message.role, content: text });
  }
  return out;
}

function encode_sse(chunk: ChatStreamChunk): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`);
}

export const POST = withRouteContext(async ({ request, family }) => {
  if (!family) {
    throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    throw new ApiError(400, "VALIDATION_ERROR", "Request body must be valid JSON");
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "messages is required");
  }

  const chat_messages = ui_messages_to_chat(body.messages);
  if (chat_messages.length === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "messages must contain text content");
  }

  const context = await loadFamilyAIContext(family.family_id);
  const system = chat_system_prompt(context);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamChatCompletion({
          messages: chat_messages,
          system,
          webSearch: Boolean(body.webSearch),
          signal: request.signal,
        })) {
          controller.enqueue(encode_sse(chunk));
        }
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
      } catch (error) {
        controller.enqueue(
          encode_sse({
            type: "error",
            errorText:
              error instanceof Error ? error.message : "Unexpected stream error",
          }),
        );
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
