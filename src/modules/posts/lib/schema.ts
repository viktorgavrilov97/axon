import { z } from "zod";

export const PostTypes = ["TEXT", "IMAGE", "VIDEO"] as const;
export type PostFormType = (typeof PostTypes)[number];

export const PostSchema = z
  .object({
    title: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .transform((v) => v?.trim() || undefined),
    content: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .transform((v) => v?.trim() || undefined),
    coverUrl: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .transform((v) => v?.trim() || undefined),
    youtubeUrl: z
      .string()
      .trim()
      .url("Enter a valid URL")
      .optional()
      .or(z.literal(""))
      .transform((v) => v?.trim() || undefined),
    isPublished: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    const hasTitle = Boolean(data.title);
    const hasContent = Boolean(data.content);
    const hasImage = Boolean(data.coverUrl);
    const hasVideo = Boolean(data.youtubeUrl);

    if (!hasTitle && !hasContent && !hasImage && !hasVideo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["title"],
        message: "Add a title, text, photo, or video",
      });
    }

    if (hasVideo && hasImage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["youtubeUrl"],
        message: "Use either a photo or a video, not both",
      });
    }
  });

export function resolvePostType(data: {
  coverUrl?: string;
  youtubeUrl?: string;
}): PostFormType {
  if (data.youtubeUrl) return "VIDEO";
  if (data.coverUrl) return "IMAGE";
  return "TEXT";
}

export type PostFormValues = {
  title?: string;
  content?: string;
  coverUrl?: string;
  youtubeUrl?: string;
  isPublished?: boolean;
};
