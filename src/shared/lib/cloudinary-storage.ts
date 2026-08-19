import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

if (!process.env.CLOUDINARY_CLOUD_NAME) {
  console.warn(
    "[CloudinaryStorage] CLOUDINARY_CLOUD_NAME not set, uploads will fail"
  );
}

type UploadFileOptions = {
  folder?: string;
  buffer: Buffer;
  resourceType?: "image" | "video" | "raw" | "auto";
  publicId?: string;
};

export async function uploadFileBuffer(
  opts: UploadFileOptions
): Promise<string> {
  const { buffer, folder = "axon/uploads", resourceType = "auto", publicId } = opts;

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error("Storage not configured (Cloudinary)");
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        overwrite: true,
        resource_type: resourceType,
        public_id: publicId,
      },
      (error, result) => {
        if (error || !result) {
          return reject(
            error ?? new Error("Cloudinary upload failed")
          );
        }
        resolve(result.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
}

