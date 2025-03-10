// src/lib/r2client.ts
import { R2Bucket } from "@cloudflare/workers-types";

export async function uploadToR2(
  bucket: R2Bucket,
  file: ArrayBuffer,
  fileName: string,
  contentType: string,
  category: string
): Promise<string> {
  // Create the file path in the bucket
  const filePath = `portfolio/${category}/${fileName}`;

  // Upload to R2
  await bucket.put(filePath, file, {
    httpMetadata: {
      contentType: contentType,
    },
  });

  // Return the public URL
  return `/static/${filePath}`;
}

export async function deleteFromR2(
  bucket: R2Bucket,
  filePath: string
): Promise<boolean> {
  try {
    // Extract the path from the public URL
    const r2Path = filePath.startsWith("/static/")
      ? filePath.substring(8) // Remove /static/ prefix
      : filePath;

    // Delete from R2
    await bucket.delete(r2Path);
    return true;
  } catch (error) {
    console.error("Error deleting from R2:", error);
    return false;
  }
}

export async function listImagesFromR2(
  bucket: R2Bucket,
  category: string
): Promise<{ src: string; width: number; height: number }[]> {
  try {
    // List objects with the prefix for this category
    const prefix = `portfolio/${category}/`;
    const listed = await bucket.list({ prefix });

    // Convert to the format expected by the frontend
    return listed.objects.map((obj) => ({
      src: `/static/${obj.key}`,
      // Default dimensions - these would ideally be stored as metadata
      width: 1000,
      height: 800,
    }));
  } catch (error) {
    console.error("Error listing from R2:", error);
    return [];
  }
}
