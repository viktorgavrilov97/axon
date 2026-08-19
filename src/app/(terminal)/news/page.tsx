import { getPostsPage } from "@/modules/posts/lib/get-posts-page";
import { NewsPage } from "@/modules/posts/components/NewsPage";

export default async function NewsPageRoute() {
  const { posts, nextCursor } = await getPostsPage();
  return <NewsPage initialPosts={posts} initialCursor={nextCursor} />;
}
