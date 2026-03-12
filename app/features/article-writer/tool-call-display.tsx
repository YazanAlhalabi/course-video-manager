import { memo, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRightIcon,
  FileTextIcon,
  PencilIcon,
  ReplaceIcon,
  PlusIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  LoaderIcon,
  XCircleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EditInput = {
  type?: string;
  old_text?: string;
  anchor?: string;
  new_text?: string;
};

type ToolCallPart = {
  type: string;
  toolCallId?: string;
  state?: string;
  output?: unknown;
  input?: {
    content?: string;
    edits?: (EditInput | undefined)[];
  };
};

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "…";
}

const editTypeConfig = {
  replace: {
    label: "Replace",
    icon: ReplaceIcon,
    color: "text-amber-500",
  },
  insert_after: {
    label: "Insert",
    icon: PlusIcon,
    color: "text-blue-500",
  },
  rewrite: {
    label: "Rewrite",
    icon: RefreshCwIcon,
    color: "text-purple-500",
  },
} as const;

function StatusIcon({ state, failed }: { state?: string; failed: boolean }) {
  if (failed) {
    return <XCircleIcon className="size-3.5 text-red-500" />;
  }
  if (state === "output-available") {
    return <CheckCircleIcon className="size-3.5 text-green-500" />;
  }
  return <LoaderIcon className="size-3.5 text-muted-foreground animate-spin" />;
}

function EditItem({ edit }: { edit: EditInput }) {
  const [open, setOpen] = useState(false);
  const editType = edit.type as keyof typeof editTypeConfig | undefined;
  const config =
    (editType && editTypeConfig[editType]) ?? editTypeConfig.replace;
  const Icon = config.icon;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50 transition-colors">
        <ChevronRightIcon
          className={cn(
            "size-3 text-muted-foreground transition-transform shrink-0",
            open && "rotate-90"
          )}
        />
        <Icon className={cn("size-3.5 shrink-0", config.color)} />
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
          {config.label}
        </Badge>
        <span className="text-muted-foreground truncate text-left">
          {edit.type === "replace" && edit.old_text
            ? truncate(edit.old_text.split("\n")[0] ?? "", 60)
            : edit.type === "insert_after" && edit.anchor
              ? `after "${truncate(edit.anchor.split("\n")[0] ?? "", 50)}"`
              : "Full document"}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-5 mr-2 mb-2 space-y-2">
          {edit.type === "replace" && edit.old_text && (
            <div className="rounded-md border border-red-500/20 bg-red-500/5 p-2">
              <div className="text-[10px] uppercase tracking-wide text-red-400 mb-1 font-medium">
                Remove
              </div>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words font-mono leading-relaxed">
                {truncate(edit.old_text, 500)}
              </pre>
            </div>
          )}
          {edit.type === "insert_after" && edit.anchor && (
            <div className="rounded-md border border-muted bg-muted/30 p-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 font-medium">
                After
              </div>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words font-mono leading-relaxed">
                {truncate(edit.anchor, 300)}
              </pre>
            </div>
          )}
          {edit.new_text && (
            <div className="rounded-md border border-green-500/20 bg-green-500/5 p-2">
              <div className="text-[10px] uppercase tracking-wide text-green-400 mb-1 font-medium">
                {edit.type === "rewrite" ? "New content" : "Add"}
              </div>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words font-mono leading-relaxed">
                {truncate(edit.new_text, 500)}
              </pre>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export const WriteDocumentDisplay = memo(function WriteDocumentDisplay({
  part,
}: {
  part: ToolCallPart;
}) {
  const [open, setOpen] = useState(false);
  const isStreaming =
    part.state !== "output-available" && part.state !== "error";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50 transition-colors w-full">
        <ChevronRightIcon
          className={cn(
            "size-3.5 text-muted-foreground transition-transform shrink-0",
            open && "rotate-90"
          )}
        />
        <FileTextIcon className="size-3.5 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground font-medium">
          {isStreaming ? "Writing document…" : "Wrote document"}
        </span>
        <StatusIcon state={part.state} failed={false} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-5 mr-2 mb-2">
          {part.input?.content ? (
            <div className="rounded-md border border-muted bg-muted/30 p-2">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words font-mono leading-relaxed max-h-48 overflow-y-auto">
                {truncate(part.input.content, 800)}
              </pre>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic px-2">
              Document content not available
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});

export const EditDocumentDisplay = memo(function EditDocumentDisplay({
  part,
}: {
  part: ToolCallPart;
}) {
  const [open, setOpen] = useState(false);
  const edits = (part.input?.edits ?? []).filter(
    (e): e is EditInput => e != null
  );
  const editCount = edits.length;
  const isStreaming =
    part.state !== "output-available" && part.state !== "error";
  const result = part.state === "output-available" ? part.output : undefined;
  const failed = typeof result === "string" && !result.includes("successfully");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50 transition-colors w-full">
        <ChevronRightIcon
          className={cn(
            "size-3.5 text-muted-foreground transition-transform shrink-0",
            open && "rotate-90"
          )}
        />
        <PencilIcon className="size-3.5 text-muted-foreground shrink-0" />
        <span
          className={cn(
            "font-medium",
            failed ? "text-red-500" : "text-muted-foreground"
          )}
        >
          {failed
            ? "Edit failed — retrying…"
            : isStreaming
              ? "Editing document…"
              : `Edited document (${editCount} ${editCount === 1 ? "edit" : "edits"})`}
        </span>
        <StatusIcon state={part.state} failed={failed} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-2 mr-2 mb-2 space-y-0.5">
          {edits.map((edit, i) => (
            <EditItem key={i} edit={edit} />
          ))}
          {edits.length === 0 && isStreaming && (
            <div className="text-xs text-muted-foreground italic px-2 py-1">
              Preparing edits…
            </div>
          )}
          {failed && typeof result === "string" && (
            <div className="rounded-md border border-red-500/20 bg-red-500/5 p-2 ml-5 text-xs text-red-400">
              {result}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
