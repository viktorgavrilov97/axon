import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

if (!process.env.CLOUDINARY_CLOUD_NAME) {
  console.warn(
    "[AvatarStorage] CLOUDINARY_CLOUD_NAME not set, avatar uploads will fail"
  );
}

type UploadAvatarOptions = {
  userId: string;
  buffer: Buffer;
  contentType?: string;
};

/**
 * Uploads a user avatar to Cloudinary, optimizes it and returns a public URL.
 * This replaces the previous S3-based implementation.
 *
 * Avatars are:
 * - Resized to 256×256 with fill crop and auto gravity
 * - Converted to WebP format
 * - Quality set to auto for optimal file size
 * - Stored in folder structure: {CLOUDINARY_AVATAR_FOLDER}/{userId}/
 */
export async function uploadAvatarBuffer(
  opts: UploadAvatarOptions
): Promise<string> {
  const { userId, buffer } = opts;

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error("Avatar storage not configured (Cloudinary)");
  }

  const folder =
    process.env.CLOUDINARY_AVATAR_FOLDER || "axon/avatars";

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `${folder}/${userId}`,
        overwrite: true,
        resource_type: "image",
        format: "webp",
        transformation: [
          {
            width: 256,
            height: 256,
            crop: "fill",
            gravity: "auto",
          },
          {
            quality: "auto",
          },
        ],
      },
      (error, result) => {
        if (error || !result) {
          return reject(
            error ?? new Error("Cloudinary upload failed")
          );
        }
        // Use secure_url as avatarUrl
        resolve(result.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
}
