"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PostFormValues, PostSchema } from "../lib/schema";
import { PostDto } from "../lib/types";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { createPost, updatePost } from "../api/post-actions";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Image from "next/image";
import { Image as ImageIcon, YoutubeLogo, X } from "@phosphor-icons/react";

function extractYouTubeId(url: string): string | null {
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

interface PostFormProps {
  initialData?: PostDto;
}

export function PostForm({ initialData }: PostFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(initialData?.coverUrl ?? null);
  const [ytPreview, setYtPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PostFormValues>({
    resolver: zodResolver(PostSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      content: initialData?.content ?? "",
      coverUrl: initialData?.coverUrl ?? "",
      youtubeUrl: initialData?.youtubeUrl ?? "",
      isPublished: initialData?.isPublished ?? true,
    },
  });

  const youtubeUrl = watch("youtubeUrl");
  const coverUrl = watch("coverUrl");

  useEffect(() => {
    if (youtubeUrl) {
      const id = extractYouTubeId(youtubeUrl);
      setYtPreview(id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null);
    } else {
      setYtPreview(null);
    }
  }, [youtubeUrl]);

  useEffect(() => {
    if (coverUrl && !coverUrl.startsWith("blob:")) {
      setPreview(coverUrl);
    }
  }, [coverUrl]);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Only JPG, PNG, WebP, and GIF images are allowed");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10 MB limit");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "image");

    setIsUploading(true);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to upload image");
        setPreview(null);
        setValue("coverUrl", "", { shouldValidate: true });
        return;
      }
      setValue("youtubeUrl", "", { shouldValidate: true });
      setValue("coverUrl", data.url, { shouldValidate: true, shouldDirty: true });
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
      setPreview(null);
      setValue("coverUrl", "", { shouldValidate: true });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = () => {
    setPreview(null);
    setValue("coverUrl", "", { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = (values: PostFormValues) => {
    const payload: PostFormValues = {
      ...values,
      isPublished: initialData ? values.isPublished : true,
    };

    startTransition(async () => {
      try {
        const result = initialData
          ? await updatePost(initialData.id, payload)
          : await createPost(payload);

        if (!result.success) {
          toast.error("error" in result && result.error ? result.error : "Failed to save");
          return;
        }

        toast.success("Post saved");
        router.push("/admin/posts");
        router.refresh();
      } catch {
        toast.error("Failed to save post");
      }
    });
  };

  const hasVideo = Boolean(youtubeUrl?.trim());

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      <input type="hidden" {...register("coverUrl")} />

      <Input
        label="Title (optional)"
        placeholder="Post title…"
        error={errors.title?.message}
        disabled={isPending}
        {...register("title")}
      />

      <label className="block">
        <span className="text-body text-white-900">Text (optional)</span>
        <textarea
          {...register("content")}
          className="mt-2 w-full rounded-xl border border-onsurface-800 bg-transparent px-4 py-3 text-body text-white-900 placeholder-white-600 focus:outline-none focus:border-onsurface-600"
          rows={4}
          placeholder="Post body…"
          disabled={isPending}
        />
      </label>

      <div className="space-y-3">
        <p className="text-body text-white-900">Photo (optional)</p>

        {preview && !hasVideo ? (
          <div className="relative rounded-xl overflow-hidden border border-onsurface-800 w-full aspect-square max-w-lg">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover"
              unoptimized={preview.startsWith("/uploads/") || preview.startsWith("blob:")}
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X size={16} className="text-white-900" />
            </button>
          </div>
        ) : (
          !hasVideo && (
            <>
              <button
                type="button"
                onClick={handleUploadClick}
                disabled={isUploading || isPending}
                className="w-full max-w-lg aspect-square rounded-xl border-2 border-dashed border-onsurface-700 flex flex-col items-center justify-center gap-2 hover:border-onsurface-500 transition-colors disabled:opacity-60"
              >
                <ImageIcon size={32} className="text-white-600" />
                <span className="text-body text-white-600">
                  {isUploading ? "Uploading…" : "Click to upload photo"}
                </span>
                <span className="text-caption text-white-500">JPG, PNG, WebP, GIF — up to 10 MB</span>
              </button>
              <Button type="button" variant="secondary" onClick={handleUploadClick} disabled={isUploading || isPending}>
                {isUploading ? "Uploading…" : "Choose file"}
              </Button>
            </>
          )
        )}

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />
        {errors.coverUrl && <p className="text-redhaze text-small">{errors.coverUrl.message}</p>}
      </div>

      <div className="space-y-3">
        <Input
          label="YouTube (optional)"
          placeholder="https://youtube.com/watch?v=…"
          error={errors.youtubeUrl?.message}
          disabled={isPending}
          {...register("youtubeUrl", {
            onChange: (e) => {
              if (e.target.value.trim()) {
                setValue("coverUrl", "", { shouldValidate: true });
                setPreview(null);
              }
            },
          })}
        />
        {ytPreview && (
          <div className="relative rounded-xl overflow-hidden border border-onsurface-800 w-full aspect-video max-w-lg">
            <Image src={ytPreview} alt="YouTube preview" fill className="object-cover" />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                <YoutubeLogo size={24} weight="fill" className="text-red-600" />
              </div>
            </div>
          </div>
        )}
      </div>

      {initialData && (
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div className="relative">
            <input type="checkbox" className="sr-only peer" {...register("isPublished")} />
            <div className="w-10 h-6 rounded-full bg-onsurface-800 peer-checked:bg-primary-500 transition-colors" />
            <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
          </div>
          <span className="text-body text-white-900">Published</span>
        </label>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" isLoading={isPending || isUploading} disabled={isUploading}>
          {initialData ? "Save changes" : "Create post"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/posts")} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
