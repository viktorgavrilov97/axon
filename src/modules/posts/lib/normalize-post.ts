import { PostFormValues, resolvePostType } from "./schema";

export function normalizePostInput(values: PostFormValues) {
  const type = resolvePostType(values);
  const title = values.title?.trim() || "";

  return {
    type,
    title,
    content: values.content ?? null,
    coverUrl: type === "VIDEO" ? null : values.coverUrl ?? null,
    youtubeUrl: type === "VIDEO" ? values.youtubeUrl ?? null : null,
    isPublished: values.isPublished ?? true,
  };
}

export type NormalizedPostInput = ReturnType<typeof normalizePostInput>;
