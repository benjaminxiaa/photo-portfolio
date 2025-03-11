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

// In src/app/api/images/route.ts
export async function GET(request: NextRequest) {
  // Get the category from query parameters
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  console.log(`API: Fetching images for category: ${category}`);

  if (!category) {
    return NextResponse.json(
      { success: false, message: "Category parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Log R2 configuration (don't log the full secret key!)
    console.log(`API: Using R2 endpoint: ${process.env.R2_ENDPOINT}`);
    console.log(`API: Using R2 bucket: ${process.env.R2_BUCKET_NAME}`);
    console.log(`API: Using prefix: portfolio/${category}/`);

    // Create S3 client configured for Cloudflare R2
    const s3 = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
    });

    // List objects in the specified category folder
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: `portfolio/${category}/`,
    });

    console.log(`API: Sending list command to R2`);
    const listResult = await s3.send(listCommand);

    console.log(
      `API: Got result from R2, contents: ${JSON.stringify(
        listResult.Contents
      )}`
    );

    if (!listResult.Contents || listResult.Contents.length === 0) {
      console.log(`API: No images found for category ${category}`);
      return NextResponse.json({ success: true, images: [] });
    }

    // Log number of objects found
    console.log(`API: Found ${listResult.Contents.length} objects in R2`);

    // Rest of your code...
  } catch (error) {
    console.error("API Error fetching images:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
