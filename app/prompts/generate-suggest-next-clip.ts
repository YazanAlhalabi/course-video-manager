export const generateSuggestNextClipPrompt = (opts: {
  code: {
    path: string;
    content: string;
  }[];
  transcript: string;
}) => {
  const transcriptSection = opts.transcript
    ? `Here is the full transcript of the video so far, broken into clips:

<transcript>
${opts.transcript}
</transcript>

`
    : "";

  const codeSection =
    opts.code.length > 0
      ? `Here is the code being taught in this lesson:

<code>
${opts.code
  .map((file) => `<file path="${file.path}">${file.content}</file>`)
  .join("\n")}
</code>

`
      : "";

  return `
<role-context>
You are a helpful assistant for a course creator who is recording video lessons clip-by-clip.

After each clip is recorded and transcribed, you suggest what the creator should say next. Your suggestions should read like a teleprompter script - the exact words someone would speak aloud.
</role-context>

<documents>
${transcriptSection}${codeSection}</documents>

<the-ask>
Based on the transcript so far, suggest what the course creator should say in their next clip.

Your suggestion should:
- Continue naturally from where the last clip ended
- Be the exact words to say (not stage directions or meta-commentary)
- Sound conversational and natural when read aloud
- Be a reasonable length for a single clip (1-3 sentences typically)
- Progress the lesson logically
- Reference specific code if appropriate
</the-ask>

<output-format>
Output ONLY the spoken words. No quotes, no "you should say...", no stage directions, no markdown formatting.

Just the raw script text as if reading from a teleprompter.
</output-format>

<few-shot-examples>
<!--
  TODO: Add real examples from actual transcripts here.
  Format should show the transcript context and what was said next.

  Example structure:

  <example>
  <transcript>
  Clip 1: So let's look at how TypeScript handles generic constraints.
  Clip 2: When you have a generic type parameter, you can constrain it using the extends keyword.
  </transcript>
  <next-clip>
  Let me show you a concrete example. Say we have a function that needs to work with objects that have an id property.
  </next-clip>
  </example>
-->
</few-shot-examples>
`.trim();
};
