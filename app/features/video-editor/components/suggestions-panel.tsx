import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const partsToText = (parts: UIMessage["parts"]) => {
  return parts
    .map((part) => {
      if (part.type === "text") {
        return part.text;
      }
      return "";
    })
    .join("");
};

export type SuggestionsPanelProps = {
  videoId: string;
  lastTranscribedClipId: string | null;
};

const SUGGESTIONS_ENABLED_KEY = "suggestions-enabled";

export function SuggestionsPanel(props: SuggestionsPanelProps) {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SUGGESTIONS_ENABLED_KEY) === "true";
  });

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: `/videos/${props.videoId}/suggest-next-clip`,
    }),
  });

  const lastAssistantMessage = messages.find((m) => m.role === "assistant");
  const suggestionText = lastAssistantMessage
    ? partsToText(lastAssistantMessage.parts)
    : "";

  const isStreaming = status === "streaming";

  const triggerSuggestion = useCallback(() => {
    setMessages([]);
    sendMessage(
      { text: "Suggest what I should say next." },
      {
        body: {
          enabledFiles: [],
        },
      }
    );
  }, [sendMessage, setMessages]);

  // Trigger suggestion when lastTranscribedClipId changes and suggestions are enabled
  useEffect(() => {
    if (enabled && props.lastTranscribedClipId) {
      triggerSuggestion();
    }
  }, [enabled, props.lastTranscribedClipId, triggerSuggestion]);

  const handleEnabledChange = (checked: boolean) => {
    setEnabled(checked);
    localStorage.setItem(SUGGESTIONS_ENABLED_KEY, String(checked));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Checkbox
          id="suggestions-enabled"
          checked={enabled}
          onCheckedChange={handleEnabledChange}
        />
        <Label htmlFor="suggestions-enabled" className="cursor-pointer">
          Enable AI suggestions
        </Label>
      </div>

      {enabled && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-300">
              Next clip suggestion
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={triggerSuggestion}
              disabled={isStreaming || !props.lastTranscribedClipId}
              className="h-6 w-6 p-0"
            >
              <RefreshCwIcon
                className={`h-4 w-4 ${isStreaming ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
          <ScrollArea className="h-[150px] rounded border border-gray-700 bg-gray-800/50 p-3">
            {isStreaming && !suggestionText && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2Icon className="h-4 w-4 animate-spin" />
                Generating suggestion...
              </div>
            )}
            {suggestionText && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {suggestionText}
              </p>
            )}
            {!isStreaming && !suggestionText && props.lastTranscribedClipId && (
              <p className="text-sm text-gray-500">
                Click refresh to generate a suggestion.
              </p>
            )}
            {!isStreaming &&
              !suggestionText &&
              !props.lastTranscribedClipId && (
                <p className="text-sm text-gray-500">
                  Record and transcribe a clip to get suggestions.
                </p>
              )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
