import { DBService } from "@/services/db-service";
import { layerLive } from "@/services/layer";
import { acquireTextWritingContext } from "@/services/text-writing-agent";
import { generateSuggestNextClipPrompt } from "@/prompts/generate-suggest-next-clip";
import { Experimental_Agent as Agent } from "ai";
import { Console, Effect, Schema } from "effect";
import type { Route } from "./+types/videos.$videoId.suggest-next-clip";
import { anthropic } from "@ai-sdk/anthropic";
import { data } from "react-router";

const requestSchema = Schema.Struct({
  enabledFiles: Schema.optionalWith(Schema.Array(Schema.String), {
    default: () => [],
  }),
});

export const action = async (args: Route.ActionArgs) => {
  const body = await args.request.json();
  const videoId = args.params.videoId;

  return Effect.gen(function* () {
    const parsed = yield* Schema.decodeUnknown(requestSchema)(body);
    const enabledFiles: string[] = [...parsed.enabledFiles];

    const videoContext = yield* acquireTextWritingContext({
      videoId,
      enabledFiles,
      includeTranscript: true,
      enabledSections: [],
    });

    // Fetch global links for injection into prompts
    const db = yield* DBService;
    const links = yield* db.getLinks();

    const systemPrompt = generateSuggestNextClipPrompt({
      code: videoContext.textFiles,
      transcript: videoContext.transcript,
      links,
    });

    const agent = new Agent({
      model: anthropic("claude-haiku-4-5"),
      system: systemPrompt,
    });

    const result = agent.stream({
      messages: [
        {
          role: "user",
          content: "Suggest what I should say next.",
        },
      ],
    });

    return result.toUIMessageStreamResponse();
  }).pipe(
    Effect.tapErrorCause((e) => Console.dir(e, { depth: null })),
    Effect.catchTag("ParseError", () => {
      return Effect.die(data("Invalid request", { status: 400 }));
    }),
    Effect.catchAll(() => {
      return Effect.die(data("Internal server error", { status: 500 }));
    }),
    Effect.provide(layerLive),
    Effect.runPromise
  );
};
