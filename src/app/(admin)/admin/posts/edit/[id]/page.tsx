import Link from "next/link";
import { getCurrentUser } from "@/shared/lib/auth";
import { redirect } from "next/navigation";
import { getPostById } from "@/modules/posts/api/post-actions";
import { PostForm } from "@/modules/posts/components/PostForm";

interface AdminPostEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminPostEditPage({ params }: AdminPostEditPageProps) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    redirect("/operations");
  }

  const { id } = await params;
  const post = await getPostById(id);

  if (!post) {
    redirect("/admin/posts");
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <Link href="/admin/posts" className="text-white-600 hover:text-white-900 text-body">
          ← Back to posts
        </Link>
        <h1 className="text-3xl text-white-900 mt-3">Edit post</h1>
      </div>
      <PostForm initialData={post} />
    </div>
  );
}
