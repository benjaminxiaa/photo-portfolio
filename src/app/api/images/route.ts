// src/app/api/images/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// Set R2 credentials
const R2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || "",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export const runtime = "edge";

// Helper function to get images by category
async function getImagesByCategory(category: string) {
  const validCategories = ["wildlife", "nature", "architecture", "travel"];
  if (!validCategories.includes(category)) {
    throw new Error("Invalid category");
  }

  const prefix = `static/portfolio/${category}/`;

  const command = new ListObjectsV2Command({
    Bucket: process.env.R2_BUCKET_NAME,
    Prefix: prefix,
  });

  const response = await R2.send(command);

  if (!response.Contents) {
    return [];
  }

  // Get image metadata from R2 and construct image objects
  const baseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

  // Return all images with dimensions (we'll compute height and width on frontend)
  return response.Contents.map((item) => {
    if (!item.Key) return null;

    return {
      src: `${baseUrl}/${item.Key}`,
      width: 1000, // Default width, will be updated on frontend with real dimensions
      height: 800, // Default height, will be updated on frontend with real dimensions
    };
  }).filter(Boolean);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category is required" },
        { status: 400 }
      );
    }

    const images = await getImagesByCategory(category);
    return NextResponse.json({ success: true, images });
  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to fetch images",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { src, category } = body;

    if (!src || !category) {
      return NextResponse.json(
        { success: false, message: "Source URL and category are required" },
        { status: 400 }
      );
    }

    // Extract the path from the full URL
    const baseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
    if (!src.startsWith(baseUrl)) {
      return NextResponse.json(
        { success: false, message: "Invalid source URL" },
        { status: 400 }
      );
    }

    // Get the R2 key from the full URL
    const key = src.replace(baseUrl + "/", "");

    // Delete from R2
    await R2.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
    );

    return NextResponse.json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Delete failed",
      },
      { status: 500 }
    );
  }
}
