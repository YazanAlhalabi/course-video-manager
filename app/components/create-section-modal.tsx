import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { capitalizeTitle } from "@/utils/capitalize-title";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useFetcher } from "react-router";

export function CreateSectionModal(props: {
  repoVersionId: string;
  maxOrder: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fetcher?: ReturnType<typeof useFetcher>;
}) {
  const internalFetcher = useFetcher();
  const fetcher = props.fetcher ?? internalFetcher;
  const [title, setTitle] = useState("");
  const isValid = title.trim().length > 0;

  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (!open) setTitle("");
        props.onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Section</DialogTitle>
        </DialogHeader>
        <fetcher.Form
          method="post"
          action="/api/sections/create"
          className="space-y-4 py-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!isValid) return;
            const formData = new FormData(e.currentTarget);
            formData.set("title", capitalizeTitle(title.trim()));
            await fetcher.submit(formData, {
              method: "post",
              action: "/api/sections/create",
            });
            setTitle("");
            props.onOpenChange(false);
          }}
        >
          <input
            type="hidden"
            name="repoVersionId"
            value={props.repoVersionId}
          />
          <input type="hidden" name="maxOrder" value={props.maxOrder} />
          <div className="space-y-2">
            <Label htmlFor="section-title">Title</Label>
            <Input
              id="section-title"
              name="title"
              placeholder="e.g. Advanced Patterns"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setTitle("");
                props.onOpenChange(false);
              }}
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid}>
              {fetcher.state === "submitting" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Create Section"
              )}
            </Button>
          </div>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
