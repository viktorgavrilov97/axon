"use server";

import { revalidatePath } from "next/cache";
import { unstable_noStore as noStore } from "next/cache";
import { db } from "@/shared/lib/db";
import { getCurrentUser } from "@/shared/lib/auth";
import { PostFormValues, PostSchema } from "../lib/schema";
import { normalizePostInput } from "../lib/normalize-post";
import { PostDto } from "../lib/types";
import { Post } from "@prisma/client";

function serializePost(post: Post): PostDto {
  return {
    id: post.id,
    title: post.title,
    content: post.content ?? undefined,
    coverUrl: post.coverUrl ?? undefined,
    youtubeUrl: post.youtubeUrl ?? undefined,
    type: post.type as PostDto["type"],
    isPublished: post.isPublished,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

async function ensureAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    throw new Error("Insufficient permissions");
  }
  return user;
}

function revalidate() {
  revalidatePath("/admin/posts");
  revalidatePath("/news");
}

export async function getPosts(options?: { includeUnpublished?: boolean }): Promise<PostDto[]> {
  noStore();
  const posts = await db.post.findMany({
    where: options?.includeUnpublished ? undefined : { isPublished: true },
    orderBy: { createdAt: "desc" },
  });
  return posts.map(serializePost);
}

export async function getPostById(id: string): Promise<PostDto | null> {
  const post = await db.post.findUnique({ where: { id } });
  return post ? serializePost(post) : null;
}

export async function createPost(rawData: PostFormValues) {
  await ensureAdmin();
  const parsed = PostSchema.parse(rawData);
  const data = normalizePostInput(parsed);

  const created = await db.post.create({
    data: {
      title: data.title,
      content: data.content,
      coverUrl: data.coverUrl,
      youtubeUrl: data.youtubeUrl,
      type: data.type,
      isPublished: true,
    },
  });

  revalidate();
  return { success: true, post: serializePost(created) };
}

export async function updatePost(id: string, rawData: PostFormValues) {
  await ensureAdmin();

  const existing = await db.post.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Post not found" };

  const parsed = PostSchema.parse(rawData);
  const data = normalizePostInput({ ...parsed, isPublished: parsed.isPublished });

  const updated = await db.post.update({
    where: { id },
    data: {
      title: data.title,
      content: data.content,
      coverUrl: data.coverUrl,
      youtubeUrl: data.youtubeUrl,
      type: data.type,
      isPublished: parsed.isPublished ?? data.isPublished,
    },
  });

  revalidate();
  return { success: true, post: serializePost(updated) };
}

export async function deletePost(id: string) {
  await ensureAdmin();

  const existing = await db.post.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Post not found" };

  await db.post.delete({ where: { id } });
  revalidate();
  return { success: true } as const;
}

export async function togglePostPublished(id: string) {
  await ensureAdmin();
  const post = await db.post.findUnique({ where: { id } });
  if (!post) return { success: false, error: "Post not found" };

  const updated = await db.post.update({
    where: { id },
    data: { isPublished: !post.isPublished },
  });

  revalidate();
  return { success: true, isPublished: updated.isPublished };
}
