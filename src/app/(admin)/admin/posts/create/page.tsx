import Link from "next/link";
import { getCurrentUser } from "@/shared/lib/auth";
import { redirect } from "next/navigation";
import { PostForm } from "@/modules/posts/components/PostForm";

export default async function AdminPostCreatePage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    redirect("/operations");
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <Link href="/admin/posts" className="text-white-600 hover:text-white-900 text-body">
          ← Back to posts
        </Link>
        <h1 className="text-3xl text-white-900 mt-3">New post</h1>
      </div>
      <PostForm />
    </div>
  );
}
