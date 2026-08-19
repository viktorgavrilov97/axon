import { z } from "zod";

export const KnowledgeItemType = {
  VIDEO: "VIDEO",
  PDF: "PDF",
  FAQ: "FAQ",
  REPORT: "REPORT",
} as const;

export type KnowledgeItemType = typeof KnowledgeItemType[keyof typeof KnowledgeItemType];

export const KnowledgeItemSchema = z.object({
  type: z.enum(["VIDEO", "PDF", "FAQ", "REPORT"]),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  youtubeUrl: z.string().url("Invalid YouTube URL").optional().or(z.literal("")),
  youtubeCoverUrl: z.string().url("Invalid Cover URL").optional().or(z.literal("")),
  pdfUrl: z.string().optional(), // validated in logic based on type
  faqQuestion: z.string().optional(),
  faqAnswer: z.string().optional(),
}).refine((data) => {
  if (data.type === "VIDEO") {
    return !!data.youtubeUrl;
  }
  if (data.type === "PDF" || data.type === "REPORT") {
    // pdfUrl is required for PDF/REPORT, but we might handle upload separately.
    // For update it might be optional if already exists.
    // We'll enforce it in the action logic.
    return true; 
  }
  if (data.type === "FAQ") {
    return !!data.title && !!data.faqAnswer; // Using title as question
  }
  return true;
}, {
  message: "Missing required fields for the selected type",
  path: ["type"],
});

export type KnowledgeItemInput = z.infer<typeof KnowledgeItemSchema>;

