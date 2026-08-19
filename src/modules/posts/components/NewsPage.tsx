"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { PostDto } from "../lib/types";
import { POSTS_PAGE_SIZE } from "../lib/constants";
import { Play, YoutubeLogo } from "@phosphor-icons/react";

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

function formatPostDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface NewsPageProps {
  initialPosts: PostDto[];
  initialCursor: string | null;
}

function FeedPost({ post, onOpenVideo }: { post: PostDto; onOpenVideo: (url?: string) => void }) {
  const ytId = extractYouTubeId(post.youtubeUrl);
  const isVideo = post.type === "VIDEO" && Boolean(post.youtubeUrl);
  const imageUrl = !isVideo ? post.coverUrl : undefined;
  const videoThumb = isVideo && ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : undefined;
  const isLocalUpload = Boolean(imageUrl?.startsWith("/uploads/"));
  const hasCaption = Boolean(post.title?.trim() || post.content?.trim());
  const isTextOnly = !isVideo && !imageUrl;

  return (
    <article className="overflow-hidden rounded-2xl border border-onsurface-900 bg-surface-900/60 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-onsurface-800 bg-[#2e31b7]">
          <Image src="/logo.svg" alt="AXON" fill className="object-contain p-1.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-callout font-medium text-white-900 leading-tight">AXON</p>
        </div>
      </div>

      {isVideo ? (
        <button
          type="button"
          onClick={() => onOpenVideo(post.youtubeUrl)}
          className="group relative block w-full aspect-square bg-onsurface-950"
        >
          {videoThumb ? (
            <>
              <Image src={videoThumb} alt={post.title || "Video"} fill className="object-cover" sizes="480px" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/15">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-lg">
                  <Play size={26} weight="fill" className="ml-0.5 text-surface-900" />
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <YoutubeLogo size={48} weight="fill" className="text-white-600" />
            </div>
          )}
        </button>
      ) : imageUrl ? (
        <div className="relative w-full aspect-square bg-onsurface-950">
          <Image
            src={imageUrl}
            alt={post.title || "Post"}
            fill
            className="object-cover"
            sizes="480px"
            priority={false}
            unoptimized={isLocalUpload}
          />
        </div>
      ) : null}

      {(hasCaption || isTextOnly) && (
        <div className="px-4 pt-3 pb-1 space-y-1.5">
          {(post.title?.trim() || (isTextOnly && post.content?.trim())) && (
            <p className="text-callout text-white-900">
              <span className="font-semibold">AXON</span>
              {post.title?.trim() ? (
                <>
                  {" "}
                  <span className="font-medium">{post.title}</span>
                </>
              ) : null}
            </p>
          )}
          {post.content && (
            <p className="text-body text-white-700 whitespace-pre-wrap break-words leading-relaxed">
              {post.content}
            </p>
          )}
        </div>
      )}

      <div className="px-4 pb-3 pt-1">
        <p className="text-caption text-white-500">{formatPostDate(post.createdAt)}</p>
      </div>
    </article>
  );
}

export function NewsPage({ initialPosts, initialCursor }: NewsPageProps) {
  const [posts, setPosts] = useState<PostDto[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(Boolean(initialCursor));
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !cursor) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({ cursor, limit: String(POSTS_PAGE_SIZE) });
      const res = await fetch(`/api/posts?${params}`);
      if (!res.ok) return;

      const data = (await res.json()) as {
        posts: PostDto[];
        nextCursor: string | null;
        hasMore: boolean;
      };

      setPosts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        const fresh = data.posts.filter((p) => !ids.has(p.id));
        return [...prev, ...fresh];
      });
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error("[NewsFeed] loadMore failed", err);
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "240px", threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const handleOpenVideo = (url?: string) => {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mx-auto w-full max-w-[480px] pb-6">
      <header className="mb-5 px-1">
        <h1 className="text-2xl font-medium text-white-900">News</h1>
        <p className="text-body text-white-600 mt-1">Updates and announcements from AXON</p>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-onsurface-700 bg-surface-900/30 p-12 text-center min-h-[320px] flex items-center justify-center">
          <p className="text-body text-white-600">No posts yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 md:gap-8">
          {posts.map((post) => (
            <FeedPost key={post.id} post={post} onOpenVideo={handleOpenVideo} />
          ))}
        </div>
      )}

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          {loading ? (
            <div className="flex items-center gap-2 text-white-600">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-onsurface-700 border-t-white-600" />
              <span className="text-caption">Loading…</span>
            </div>
          ) : (
            <span className="text-caption text-white-500">Scroll to load more</span>
          )}
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <p className="text-center text-caption text-white-500 py-6">You&apos;ve reached the end</p>
      )}
    </div>
  );
}
