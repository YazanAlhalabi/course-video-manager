import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useFetcher } from "react-router";

export function EditVersionModal(props: {
  repoId: string;
  versionId: string;
  currentName: string;
  currentDescription: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fetcher = useFetcher();

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Version</DialogTitle>
        </DialogHeader>
        <fetcher.Form
          method="post"
          action={`/api/repos/${props.repoId}/rename-version`}
          className="space-y-4 py-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await fetcher.submit(e.currentTarget);
            props.onOpenChange(false);
          }}
        >
          <input type="hidden" name="versionId" value={props.versionId} />
          <div className="space-y-2">
            <Label htmlFor="version-name">Version Name</Label>
            <Input
              id="version-name"
              name="name"
              defaultValue={props.currentName}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="version-description">Description</Label>
            <Textarea
              id="version-description"
              name="description"
              defaultValue={props.currentDescription}
              placeholder="What changed in this version..."
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => props.onOpenChange(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit">
              {fetcher.state === "submitting" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
