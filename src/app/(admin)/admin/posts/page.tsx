import { getCurrentUser } from "@/shared/lib/auth";
import { redirect } from "next/navigation";
import { getPosts } from "@/modules/posts/api/post-actions";
import { AdminPostList } from "@/modules/posts/components/AdminPostList";

export default async function AdminPostsPage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    redirect("/operations");
  }

  const posts = await getPosts({ includeUnpublished: true });

  return (
    <div className="p-8">
      <AdminPostList posts={posts} />
    </div>
  );
}
