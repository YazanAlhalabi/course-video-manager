import { data } from "react-router";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Route } from "./+types/api.feedback";

const execFileAsync = promisify(execFile);

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const title = formData.get("title");
  const description = formData.get("description");

  if (typeof title !== "string" || !title.trim()) {
    throw data("Title is required", { status: 400 });
  }

  const body =
    typeof description === "string" && description.trim()
      ? description.trim()
      : "";

  try {
    await execFileAsync("gh", [
      "issue",
      "create",
      "--repo",
      "mattpocock/course-video-manager",
      "--title",
      title.trim(),
      ...(body ? ["--body", body] : []),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Failed to create GitHub issue:", error);
    throw data("Failed to create GitHub issue", { status: 500 });
  }
};
