"use client";

import Link from "next/link";
import Image from "next/image";
import { useTransition } from "react";
import toast from "react-hot-toast";
import { PencilSimple, Trash, Eye, EyeSlash, YoutubeLogo, Image as ImageIcon, TextT } from "@phosphor-icons/react";
import { PostDto } from "../lib/types";
import { deletePost, togglePostPublished } from "../api/post-actions";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";

function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/.*[?&]v=([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

function postTypeLabel(type: PostDto["type"]) {
  if (type === "VIDEO") return "Video";
  if (type === "IMAGE") return "Image";
  return "Text";
}

function postDisplayTitle(post: PostDto) {
  if (post.title?.trim()) return post.title;
  if (post.content?.trim()) return post.content.slice(0, 60) + (post.content.length > 60 ? "…" : "");
  return "(no title)";
}

interface AdminPostListProps {
  posts: PostDto[];
}

export function AdminPostList({ posts }: AdminPostListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = (post: PostDto) => {
    if (!window.confirm(`Delete post "${postDisplayTitle(post)}"?`)) return;
    startTransition(async () => {
      try {
        const result = await deletePost(post.id);
        if (result.success) {
          toast.success("Post deleted");
          router.refresh();
        } else {
          toast.error("error" in result ? result.error : "Failed to delete");
        }
      } catch {
        toast.error("Failed to delete");
      }
    });
  };

  const handleTogglePublished = (post: PostDto) => {
    startTransition(async () => {
      try {
        const result = await togglePostPublished(post.id);
        if (result.success) {
          toast.success(result.isPublished ? "Published" : "Hidden");
          router.refresh();
        }
      } catch {
        toast.error("Failed to update status");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl text-white-900">News</h1>
          <p className="text-body text-white-700 mt-1">Manage posts shown in the news feed</p>
        </div>
        <Link href="/admin/posts/create">
          <Button>+ New post</Button>
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-onsurface-700 p-10 text-center space-y-3">
          <p className="text-white-600 text-body">No posts yet</p>
          <Link href="/admin/posts/create">
            <Button variant="secondary">Create first post</Button>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-onsurface-900 rounded-2xl border border-onsurface-900 overflow-hidden">
          {posts.map((post) => {
            const ytId = post.type === "VIDEO" ? extractYouTubeId(post.youtubeUrl) : null;
            const thumbUrl =
              post.type === "VIDEO" && ytId
                ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
                : post.coverUrl;

            return (
              <div
                key={post.id}
                className="flex flex-col gap-4 bg-surface-900/40 p-4 md:flex-row md:items-center"
              >
                <div className="w-full md:w-24 h-16 rounded-lg overflow-hidden bg-onsurface-950 flex-shrink-0 flex items-center justify-center">
                  {thumbUrl ? (
                    <Image
                      src={thumbUrl}
                      alt={postDisplayTitle(post)}
                      width={96}
                      height={64}
                      className="object-cover w-full h-full"
                      unoptimized={Boolean(thumbUrl.startsWith("/uploads/"))}
                    />
                  ) : post.type === "VIDEO" ? (
                    <YoutubeLogo size={24} className="text-white-600" />
                  ) : post.type === "IMAGE" ? (
                    <ImageIcon size={24} className="text-white-600" />
                  ) : (
                    <TextT size={24} className="text-white-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-callout text-white-900 truncate">{postDisplayTitle(post)}</p>
                    <span
                      className={`text-caption px-2 py-0.5 rounded-full ${
                        post.isPublished
                          ? "bg-green-500/20 text-green-400"
                          : "bg-onsurface-800 text-white-600"
                      }`}
                    >
                      {post.isPublished ? "Published" : "Hidden"}
                    </span>
                    <span className="text-caption px-2 py-0.5 rounded-full bg-onsurface-800 text-white-600">
                      {postTypeLabel(post.type)}
                    </span>
                  </div>
                  {post.content && post.title?.trim() && (
                    <p className="text-body text-white-600 mt-1 line-clamp-1">{post.content}</p>
                  )}
                  <p className="text-caption text-white-500 mt-1">
                    {new Date(post.createdAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="border border-onsurface-800"
                    onClick={() => handleTogglePublished(post)}
                    disabled={isPending}
                    title={post.isPublished ? "Hide" : "Publish"}
                  >
                    {post.isPublished ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </Button>
                  <Link href={`/admin/posts/edit/${post.id}`}>
                    <Button variant="secondary" size="sm">
                      <PencilSimple size={16} />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="border border-redhaze text-redhaze"
                    onClick={() => handleDelete(post)}
                    disabled={isPending}
                  >
                    <Trash size={16} />
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
