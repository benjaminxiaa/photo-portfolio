// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2client";

export const runtime = "edge";

// Validate category
function isValidCategory(category: string): boolean {
  const validCategories = ["nature", "wildlife", "architecture", "travel"];
  return validCategories.includes(category);
}

// Helper for error responses with more detailed logging
function errorResponse(
  message: string,
  details?: Record<string, unknown>,
  status = 400
): NextResponse {
  console.error(`Error Response: ${message}`, details);
  return NextResponse.json(
    {
      success: false,
      message,
      details: details ? JSON.stringify(details) : undefined,
    },
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    console.log("Starting POST request");

    // Check if this is a multipart/form-data request
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("multipart/form-data")) {
      return errorResponse(
        "Incorrect content type. Must be multipart/form-data",
        {
          receivedContentType: contentType || "undefined",
        }
      );
    }

    // Parse form data
    let formData;
    try {
      formData = await request.formData();
    } catch (formError) {
      return errorResponse("Failed to parse form data", {
        errorMessage:
          formError instanceof Error ? formError.message : String(formError),
      });
    }

    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string | null;

    if (!file) {
      return errorResponse("No file provided");
    }

    if (!category) {
      return errorResponse("No category provided");
    }

    // Validate category
    if (!isValidCategory(category)) {
      return errorResponse("Invalid category", {
        providedCategory: category,
        validCategories: ["nature", "wildlife", "architecture", "travel"],
      });
    }

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
      "image/gif",
    ];
    if (!validTypes.includes(file.type)) {
      return errorResponse("File must be an image (JPEG, PNG, WebP, GIF)", {
        fileType: file.type,
      });
    }

    // Read file as ArrayBuffer
    const buffer = await file.arrayBuffer();

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileName = file.name;
    const fileExt = fileName.match(/\.[^/.]+$/) || [".jpg"];
    const baseFileName = fileName.replace(/\.[^/.]+$/, "");
    const uniqueFileName = `${baseFileName}-${timestamp}${fileExt[0]}`;

    // Get R2 bucket from environment
    // @ts-expect-error - env is provided by Cloudflare runtime
    const bucket = request.env?.PORTFOLIO_BUCKET;
    if (!bucket) {
      return errorResponse("R2 bucket not available", {}, 500);
    }

    // Upload to R2
    try {
      const imageSrc = await uploadToR2(
        bucket,
        buffer,
        uniqueFileName,
        file.type,
        category
      );

      return NextResponse.json({
        success: true,
        message: "File uploaded successfully",
        filePath: imageSrc,
      });
    } catch (uploadError) {
      return errorResponse(
        `Failed to upload to R2: ${
          uploadError instanceof Error
            ? uploadError.message
            : String(uploadError)
        }`,
        {
          errorType:
            uploadError instanceof Error ? uploadError.name : "Unknown",
        },
        500
      );
    }
  } catch (error) {
    return errorResponse(
      `Unexpected error during upload: ${
        error instanceof Error ? error.message : String(error)
      }`,
      {},
      500
    );
  }
}

// CORS handling
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
