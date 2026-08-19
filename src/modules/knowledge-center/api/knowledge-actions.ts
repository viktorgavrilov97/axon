"use server";

import { db } from "@/shared/lib/db";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/shared/lib/auth";
import { KnowledgeItemSchema, KnowledgeItemInput } from "../lib/schema";

// Actions

export async function getKnowledgeItems(isAdmin = false) {
  const user = await getCurrentUser();
  if (isAdmin && user?.role !== "ADMIN" && user?.role !== "SUPERADMIN") {
    throw new Error("Unauthorized");
  }

  // All items are published immediately, no need to filter
  return await db.knowledgeItem.findMany({
    orderBy: { order: "asc" },
  });
}

export async function createKnowledgeItem(data: KnowledgeItemInput) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN" && user?.role !== "SUPERADMIN") {
    return { ok: false, error: "Unauthorized" };
  }

  const parsed = KnowledgeItemSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().fieldErrors };
  }

  // derive youtube cover if needed
  let youtubeCoverUrl = data.youtubeCoverUrl;
  if (data.type === "VIDEO" && data.youtubeUrl && !youtubeCoverUrl) {
    const videoId = extractYoutubeVideoId(data.youtubeUrl);
    if (videoId) {
      youtubeCoverUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
  }

  // Get max order to append to end
  const maxOrder = await db.knowledgeItem.aggregate({
    _max: { order: true },
  });
  const newOrder = (maxOrder._max.order ?? 0) + 1;

  try {
    await db.knowledgeItem.create({
      data: {
        ...data,
        youtubeCoverUrl,
        order: newOrder,
        isPublished: true, // Always publish immediately
        faqQuestion: data.type === "FAQ" ? data.title : undefined, // Use title as question
      },
    });
    revalidatePath("/knowledge-center");
    revalidatePath("/admin/knowledge-center");
    return { ok: true };
  } catch (error) {
    console.error("Failed to create knowledge item:", error);
    return { ok: false, error: "Failed to create item" };
  }
}

export async function updateKnowledgeItem(id: string, data: Partial<KnowledgeItemInput>) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN" && user?.role !== "SUPERADMIN") {
    return { ok: false, error: "Unauthorized" };
  }

  // derive youtube cover if needed and changed
  let youtubeCoverUrl = data.youtubeCoverUrl;
  if (data.type === "VIDEO" && data.youtubeUrl) {
     const videoId = extractYoutubeVideoId(data.youtubeUrl);
     if (videoId && (!youtubeCoverUrl || youtubeCoverUrl.includes("img.youtube.com"))) {
        // Only auto-update if it looks like an auto-generated one or is missing
        youtubeCoverUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
     }
  }

  try {
    await db.knowledgeItem.update({
      where: { id },
      data: {
        ...data,
        youtubeCoverUrl,
        updatedAt: new Date(),
        faqQuestion: data.type === "FAQ" && data.title ? data.title : undefined,
      },
    });
    revalidatePath("/knowledge-center");
    revalidatePath("/admin/knowledge-center");
    return { ok: true };
  } catch (error) {
    console.error("Failed to update knowledge item:", error);
    return { ok: false, error: "Failed to update item" };
  }
}

export async function deleteKnowledgeItem(id: string) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN" && user?.role !== "SUPERADMIN") {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    await db.knowledgeItem.delete({ where: { id } });
    revalidatePath("/knowledge-center");
    revalidatePath("/admin/knowledge-center");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: "Failed to delete item" };
  }
}

export async function togglePublishKnowledgeItem(id: string, isPublished: boolean) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN" && user?.role !== "SUPERADMIN") {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    await db.knowledgeItem.update({
      where: { id },
      data: { isPublished },
    });
    revalidatePath("/knowledge-center");
    revalidatePath("/admin/knowledge-center");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: "Failed to toggle publish status" };
  }
}

export async function reorderKnowledgeItem(id: string, direction: "up" | "down") {
    const user = await getCurrentUser();
    if (user?.role !== "ADMIN" && user?.role !== "SUPERADMIN") {
      return { ok: false, error: "Unauthorized" };
    }

    const item = await db.knowledgeItem.findUnique({ where: { id } });
    if (!item) return { ok: false, error: "Item not found" };

    const swapItem = await db.knowledgeItem.findFirst({
        where: {
            order: direction === "up" ? { lt: item.order } : { gt: item.order }
        },
        orderBy: { order: direction === "up" ? "desc" : "asc" }
    });

    if (!swapItem) return { ok: false, error: "Cannot move further" };

    // Swap orders
    await db.$transaction([
        db.knowledgeItem.update({ where: { id: item.id }, data: { order: swapItem.order } }),
        db.knowledgeItem.update({ where: { id: swapItem.id }, data: { order: item.order } })
    ]);

    revalidatePath("/knowledge-center");
    revalidatePath("/admin/knowledge-center");
    return { ok: true };
}

// Helper
function extractYoutubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}
