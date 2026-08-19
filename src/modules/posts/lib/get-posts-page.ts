import { unstable_noStore as noStore } from "next/cache";
import { db } from "@/shared/lib/db";
import { Post } from "@prisma/client";
import { POSTS_PAGE_SIZE } from "./constants";
import { PostDto } from "./types";

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

export async function getPostsPage(options?: {
  cursor?: string | null;
  limit?: number;
  includeUnpublished?: boolean;
}): Promise<{ posts: PostDto[]; nextCursor: string | null; hasMore: boolean }> {
  noStore();

  const limit = Math.min(Math.max(options?.limit ?? POSTS_PAGE_SIZE, 1), 30);
  const cursor = options?.cursor ?? null;

  const posts = await db.post.findMany({
    where: options?.includeUnpublished ? undefined : { isPublished: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;

  return {
    posts: items.map(serializePost),
    nextCursor: hasMore ? items[items.length - 1].id : null,
    hasMore,
  };
}
