"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { List, Sparkles } from "lucide-react";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import type { ToolUIPart, UIMessage } from "ai";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageBranch,
  MessageBranchContent,
  MessageBranchNext,
  MessageBranchPage,
  MessageBranchPrevious,
  MessageBranchSelector,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";

import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { GlobeIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "./ui/badge";

interface MessageType {
  key: string;
  from: "user" | "assistant";
  sources?: { href: string; title: string }[];
  versions: {
    id: string;
    content: string;
  }[];
  reasoning?: {
    content: string;
    duration: number;
  };
  tools?: {
    name: string;
    description: string;
    status: ToolUIPart["state"];
    parameters: Record<string, unknown>;
    result: string | undefined;
    error: string | undefined;
  }[];
}

const initialMessages: MessageType[] = [];

const SuggestionItem = ({
  suggestion,
  onClick,
}: {
  suggestion: string;
  onClick: (suggestion: string) => void;
}) => {
  const handleClick = useCallback(() => {
    onClick(suggestion);
  }, [onClick, suggestion]);

  return <Suggestion onClick={handleClick} suggestion={suggestion} />;
};

export const AiDialog = ({
  context,
  contextLabel,
  suggestions,
  placeholder,
}: {
  context: {
    incomeCategories: { category_id: string; category_name: string }[];
    expenseCategories: { category_id: string; category_name: string }[];
  };
  suggestions: string[];
  contextLabel: string;
  placeholder?: string;
}) => {
  console.log("AI Dialog context:", context);
  const [text, setText] = useState<string>("");
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  const [status, setStatus] = useState<
    "submitted" | "streaming" | "ready" | "error"
  >("ready");
  const [messages, setMessages] = useState<MessageType[]>(initialMessages);
  const [, setStreamingMessageId] = useState<string | null>(null);

  const updateMessageContent = useCallback(
    (messageId: string, newContent: string) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.versions.some((v) => v.id === messageId)) {
            return {
              ...msg,
              versions: msg.versions.map((v) =>
                v.id === messageId ? { ...v, content: newContent } : v,
              ),
            };
          }
          return msg;
        }),
      );
    },
    [],
  );

  const addUserMessage = useCallback(
    (content: string) => {
      const userMessageId = `user-${Date.now()}`;
      const userMessage: MessageType = {
        from: "user",
        key: userMessageId,
        versions: [
          {
            content,
            id: userMessageId,
          },
        ],
      };

      setMessages((prev) => [...prev, userMessage]);
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: MessageType = {
        from: "assistant",
        key: assistantMessageId,
        versions: [
          {
            content: "",
            id: assistantMessageId,
          },
        ],
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStatus("streaming");
      setStreamingMessageId(assistantMessageId);

      const conversationForRequest = [...messages, userMessage];

      void (async () => {
        let hasError = false;

        try {
          const apiMessages: UIMessage[] = conversationForRequest.map((message) => {
            const latestVersion = message.versions[message.versions.length - 1];
            return {
              id: latestVersion?.id ?? message.key,
              role: message.from,
              parts: [
                {
                  type: "text",
                  text: latestVersion?.content ?? "",
                },
              ],
            };
          });

          const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages: apiMessages,
              model: "openai/gpt-4o-mini",
              webSearch: useWebSearch,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to get AI response");
          }

          if (!response.body) {
            throw new Error("No response body from AI");
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let currentContent = "";
          let streamDone = false;

          while (!streamDone) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split("\n\n");
            buffer = events.pop() ?? "";

            for (const event of events) {
              const dataLines = event
                .split("\n")
                .filter((line) => line.startsWith("data: "));

              for (const line of dataLines) {
                const rawPayload = line.slice(6).trim();
                if (!rawPayload) {
                  continue;
                }

                if (rawPayload === "[DONE]") {
                  streamDone = true;
                  break;
                }

                const chunk = JSON.parse(rawPayload) as {
                  type: string;
                  delta?: string;
                  errorText?: string;
                };

                if (chunk.type === "text-delta" && chunk.delta) {
                  currentContent += chunk.delta;
                  updateMessageContent(assistantMessageId, currentContent);
                }

                if (chunk.type === "error") {
                  throw new Error(chunk.errorText || "AI stream error");
                }
              }

              if (streamDone) {
                break;
              }
            }
          }
        } catch (error) {
          hasError = true;
          setStatus("error");
          toast.error("AI request failed", {
            description:
              error instanceof Error ? error.message : "Unable to stream response",
          });
        } finally {
          setStreamingMessageId(null);
          if (!hasError) {
            setStatus("ready");
          }
        }
      })();
    },
    [messages, updateMessageContent, useWebSearch],
  );

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      const hasText = Boolean(message.text);
      const hasAttachments = Boolean(message.files?.length);

      console.log(message);

      if (!(hasText || hasAttachments)) {
        return;
      }

      setStatus("submitted");

      if (message.files?.length) {
        toast.success("Files attached", {
          description: `${message.files.length} file(s) attached to message`,
        });
      }

      addUserMessage(message.text || "Sent with attachments");
      setText("");
    },
    [addUserMessage],
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setStatus("submitted");
      addUserMessage(suggestion);
    },
    [addUserMessage],
  );

  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(event.target.value);
    },
    [],
  );

  const toggleWebSearch = useCallback(() => {
    setUseWebSearch((prev) => !prev);
  }, []);

  const isSubmitDisabled = useMemo(
    () => !(text.trim() || status) || status === "streaming",
    [text, status],
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-primary">
          <Sparkles />
          Ask AI
        </Button>
      </DialogTrigger>
      <DialogContent className="w-screen h-screen m-0 px-0 rounded-none max-w-none!">
        <DialogHeader>
          <DialogTitle>AI analysis</DialogTitle>
        </DialogHeader>
        <div className="relative flex size-full flex-col divide-y overflow-hidden">
          <Conversation>
            <ConversationContent>
              {messages.map(({ versions, ...message }) => (
                <MessageBranch defaultBranch={0} key={message.key}>
                  <MessageBranchContent>
                    {versions.map((version) => (
                      <Message
                        from={message.from}
                        key={`${message.key}-${version.id}`}
                      >
                        <div>
                          {message.sources?.length && (
                            <Sources>
                              <SourcesTrigger count={message.sources.length} />
                              <SourcesContent>
                                {message.sources.map((source) => (
                                  <Source
                                    href={source.href}
                                    key={source.href}
                                    title={source.title}
                                  />
                                ))}
                              </SourcesContent>
                            </Sources>
                          )}
                          {message.reasoning && (
                            <Reasoning duration={message.reasoning.duration}>
                              <ReasoningTrigger />
                              <ReasoningContent>
                                {message.reasoning.content}
                              </ReasoningContent>
                            </Reasoning>
                          )}
                          <MessageContent>
                            <MessageResponse>{version.content}</MessageResponse>
                          </MessageContent>
                        </div>
                      </Message>
                    ))}
                  </MessageBranchContent>
                  {versions.length > 1 && (
                    <MessageBranchSelector>
                      <MessageBranchPrevious />
                      <MessageBranchPage />
                      <MessageBranchNext />
                    </MessageBranchSelector>
                  )}
                </MessageBranch>
              ))}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
          <div className="grid shrink-0 gap-4 pt-4">
            <Suggestions className="px-4">
              {suggestions.map((suggestion) => (
                <SuggestionItem
                  key={suggestion}
                  onClick={handleSuggestionClick}
                  suggestion={suggestion}
                />
              ))}
            </Suggestions>
            <div className="w-full px-4 pb-4">
              <PromptInput globalDrop multiple onSubmit={handleSubmit}>
                <PromptInputHeader>
                  <Badge>
                    <List size={16} className="inline-block mr-2" />
                    {contextLabel}
                  </Badge>
                </PromptInputHeader>
                <PromptInputBody>
                  <PromptInputTextarea
                    placeholder={placeholder}
                    onChange={handleTextChange}
                    value={text}
                  />
                </PromptInputBody>
                <PromptInputFooter>
                  <PromptInputTools>
                    <PromptInputButton
                      onClick={toggleWebSearch}
                      variant={useWebSearch ? "default" : "ghost"}
                    >
                      <GlobeIcon size={16} />
                      <span>Search</span>
                    </PromptInputButton>
                  </PromptInputTools>
                  <PromptInputSubmit
                    disabled={isSubmitDisabled}
                    status={status}
                  />
                </PromptInputFooter>
              </PromptInput>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
