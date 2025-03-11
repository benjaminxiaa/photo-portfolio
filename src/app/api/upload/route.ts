// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sizeOf from "image-size";

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

export async function POST(request: NextRequest) {
  try {
    // Check if it's a multipart form
    if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
      return NextResponse.json(
        { success: false, message: "Invalid content type" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string | null;

    // Validate inputs
    if (!file || !category) {
      return NextResponse.json(
        { success: false, message: "Missing file or category" },
        { status: 400 }
      );
    }

    const validCategories = ["wildlife", "nature", "architecture", "travel"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, message: "Invalid category" },
        { status: 400 }
      );
    }

    // Process the file
    const buffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);

    // Get image dimensions
    const dimensions = sizeOf(fileBuffer);
    if (!dimensions.width || !dimensions.height) {
      return NextResponse.json(
        { success: false, message: "Failed to get image dimensions" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const fileName = `${timestamp}-${originalName}`;
    const filePath = `static/portfolio/${category}/${fileName}`;

    // Upload to R2
    await R2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: filePath,
        Body: fileBuffer,
        ContentType: file.type,
      })
    );

    // Construct the public URL
    const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${filePath}`;

    // Return success response with image metadata
    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      filePath: publicUrl,
      width: dimensions.width,
      height: dimensions.height,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 }
    );
  }
}
