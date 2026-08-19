import { NextRequest } from "next/server";
import { authedJson } from "@/shared/lib/api/authed-response";
import { getCurrentUser } from "@/shared/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { randomBytes } from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const KNOWLEDGE_DIR = join(process.cwd(), "public", "uploads", "knowledge");
const POSTS_DIR = join(process.cwd(), "public", "uploads", "posts");

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  
  if (user?.role !== "ADMIN" && user?.role !== "SUPERADMIN") {
    return authedJson({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string;

    if (!file) {
      return authedJson({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return authedJson(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    let uploadDir: string;
    let publicPath: string;
    let defaultExtension: string;

    if (type === "pdf") {
      if (file.type !== "application/pdf") {
        return authedJson(
          { error: "Invalid file type. Only PDF files are allowed." },
          { status: 400 }
        );
      }
      uploadDir = KNOWLEDGE_DIR;
      publicPath = "/uploads/knowledge";
      defaultExtension = "pdf";
    } else if (type === "image") {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const allowedExt = ["jpg", "jpeg", "png", "webp", "gif"];
      if (!IMAGE_TYPES.includes(file.type) && !allowedExt.includes(ext)) {
        return authedJson(
          { error: "Invalid file type. Only JPG, PNG, WebP, GIF images are allowed." },
          { status: 400 }
        );
      }
      uploadDir = POSTS_DIR;
      publicPath = "/uploads/posts";
      defaultExtension = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
    } else {
      return authedJson({ error: "Invalid upload type" }, { status: 400 });
    }

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const fileExtension = file.name.split(".").pop() || defaultExtension;
    const uniqueId = randomBytes(16).toString("hex");
    const fileName = `${uniqueId}.${fileExtension}`;
    const filePath = join(uploadDir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const url = `${publicPath}/${fileName}`;

    return authedJson({ url });
  } catch (error) {
    console.error("Upload error:", error);
    return authedJson(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
