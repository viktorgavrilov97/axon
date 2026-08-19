import { NextResponse } from "next/server";
import { getServerSession } from "@/shared/lib/auth";
import { getPostsPage } from "@/modules/posts/lib/get-posts-page";
import { POSTS_PAGE_SIZE } from "@/modules/posts/lib/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(Number(limitParam) || POSTS_PAGE_SIZE, 30) : undefined;

  try {
    const result = await getPostsPage({ cursor, limit });

    return NextResponse.json({
      posts: result.posts,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  } catch (error) {
    console.error("[POSTS_API]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
