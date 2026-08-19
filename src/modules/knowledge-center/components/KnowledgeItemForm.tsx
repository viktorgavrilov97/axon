"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { KnowledgeItem } from "@prisma/client";
import { createKnowledgeItem, updateKnowledgeItem } from "../api/knowledge-actions";
import { KnowledgeItemSchema, KnowledgeItemInput } from "../lib/schema";
import { Button } from "@/shared/ui/button";
import { ArrowLeft, UploadSimple, Spinner } from "@phosphor-icons/react";
import toast from "react-hot-toast";

interface KnowledgeItemFormProps {
  initialData?: KnowledgeItem;
}

export function KnowledgeItemForm({ initialData }: KnowledgeItemFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<KnowledgeItemInput>({
    resolver: zodResolver(KnowledgeItemSchema),
    defaultValues: initialData ? {
      type: initialData.type,
      title: initialData.title,
      description: initialData.description || undefined,
      youtubeUrl: initialData.youtubeUrl || undefined,
      youtubeCoverUrl: initialData.youtubeCoverUrl || undefined,
      pdfUrl: initialData.pdfUrl || undefined,
      faqQuestion: initialData.faqQuestion || undefined,
      faqAnswer: initialData.faqAnswer || undefined,
    } : {
      type: "VIDEO",
    },
  });

  const type = watch("type");
  const youtubeUrl = watch("youtubeUrl");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "pdf");

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setValue("pdfUrl", data.url);
      toast.success("PDF uploaded successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload PDF");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: KnowledgeItemInput) => {
    setSubmitting(true);
    
    // For FAQ, ensure faqQuestion is set (using title)
    if (data.type === "FAQ") {
        data.faqQuestion = data.title;
    }

    try {
      let res;
      if (initialData) {
        res = await updateKnowledgeItem(initialData.id, data);
      } else {
        res = await createKnowledgeItem(data);
      }

      if (res.ok) {
        toast.success(initialData ? "Item updated" : "Item created");
        router.push("/admin/knowledge-center");
        router.refresh();
      } else {
        toast.error(typeof res.error === 'string' ? res.error : "Validation error");
        if (typeof res.error === 'object') {
            console.error(res.error);
        }
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-derive cover logic mock in UI (backend handles it too, but nice to show)
  // We can just rely on backend for simplicity as requested: "Auto cover: when URL saved, derive videoId"

  return (
    <div className="max-w-3xl mx-auto">
      <Button 
        variant="ghost" 
        className="mb-6 pl-0 hover:bg-transparent hover:text-white-500 text-white-700"
        onClick={() => router.back()}
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to list
      </Button>

      <div className="bg-onsurface-900 border border-onsurface-800 rounded-xl p-8">
        <h1 className="text-2xl font-bold text-white-900 mb-8">
          {initialData ? "Edit Knowledge Item" : "Create Knowledge Item"}
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white-700">Type</label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  className="w-full bg-onsurface-950 border border-onsurface-800 rounded-lg px-4 py-2.5 text-white-900 focus:outline-none focus:border-primary-500"
                >
                  <option value="VIDEO">Video</option>
                  <option value="PDF">Materials (PDF)</option>
                  <option value="REPORT">Reports (PDF)</option>
                  <option value="FAQ">FAQ</option>
                </select>
              )}
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white-700">
              {type === "FAQ" ? "Question" : "Title"}
            </label>
            <input
              {...register("title")}
              className="w-full bg-onsurface-950 border border-onsurface-800 rounded-lg px-4 py-2.5 text-white-900 focus:outline-none focus:border-primary-500"
              placeholder={type === "FAQ" ? "e.g. How to deposit?" : "e.g. Introduction to Crypto"}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Description - Optional for FAQ, but we can hide it for FAQ as per requirement "For FAQ you can ignore" */}
          {type !== "FAQ" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white-700">Description</label>
              <textarea
                {...register("description")}
                rows={4}
                className="w-full bg-onsurface-950 border border-onsurface-800 rounded-lg px-4 py-2.5 text-white-900 focus:outline-none focus:border-primary-500"
                placeholder="Brief description..."
              />
            </div>
          )}

          {/* Video Specific Fields */}
          {type === "VIDEO" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white-700">YouTube URL</label>
                <input
                  {...register("youtubeUrl")}
                  className="w-full bg-onsurface-950 border border-onsurface-800 rounded-lg px-4 py-2.5 text-white-900 focus:outline-none focus:border-primary-500"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                {errors.youtubeUrl && (
                  <p className="text-sm text-red-500">{errors.youtubeUrl.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white-700">Cover URL (Optional)</label>
                <input
                  {...register("youtubeCoverUrl")}
                  className="w-full bg-onsurface-950 border border-onsurface-800 rounded-lg px-4 py-2.5 text-white-900 focus:outline-none focus:border-primary-500"
                  placeholder="Auto-generated if empty"
                />
                <p className="text-xs text-white-500">Leave empty to use default YouTube thumbnail</p>
              </div>
            </>
          )}

          {/* PDF Specific Fields */}
          {(type === "PDF" || type === "REPORT") && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white-700">PDF File</label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-onsurface-800 hover:bg-onsurface-700 rounded-lg text-white-900 transition-colors">
                  {uploading ? <Spinner className="animate-spin" size={20} /> : <UploadSimple size={20} />}
                  <span>{uploading ? "Uploading..." : "Upload PDF"}</span>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
                {watch("pdfUrl") && (
                   <span className="text-sm text-primary-400">File uploaded</span>
                )}
              </div>
              <input type="hidden" {...register("pdfUrl")} />
              {errors.pdfUrl && (
                  <p className="text-sm text-red-500">{errors.pdfUrl.message}</p>
              )}
               {/* Show current file if editing */}
               {initialData?.pdfUrl && !watch("pdfUrl") && (
                 <p className="text-sm text-white-500">Current file exists. Upload new to replace.</p>
               )}
            </div>
          )}

          {/* FAQ Specific Fields */}
          {type === "FAQ" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white-700">Answer</label>
              <textarea
                {...register("faqAnswer")}
                rows={6}
                className="w-full bg-onsurface-950 border border-onsurface-800 rounded-lg px-4 py-2.5 text-white-900 focus:outline-none focus:border-primary-500"
                placeholder="Write the answer here..."
              />
              {errors.faqAnswer && (
                <p className="text-sm text-red-500">{errors.faqAnswer.message}</p>
              )}
            </div>
          )}

          <div className="pt-6 flex justify-end gap-4">
             <Button 
                type="button" 
                variant="ghost" 
                onClick={() => router.back()}
                disabled={submitting}
             >
                Cancel
             </Button>
             <Button 
                type="submit" 
                disabled={submitting || uploading}
                isLoading={submitting}
             >
                {initialData ? "Save Changes" : "Create Item"}
             </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
