// src/app/api/images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { listImagesFromR2, deleteFromR2 } from "@/lib/r2client";
import { R2Bucket } from "@cloudflare/workers-types";

export const runtime = "edge";

// Define a proper interface for the environment with R2 bucket
interface R2Environment {
  PORTFOLIO_BUCKET: R2Bucket;
}

// Validate category
function isValidCategory(category: string): boolean {
  const validCategories = ["nature", "wildlife", "architecture", "travel"];
  return validCategories.includes(category);
}

// Helper for error responses
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

// GET method to list images
export async function GET(
  request: NextRequest,
  { env }: { env: R2Environment }
) {
  try {
    // Get the category from the query string
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    if (!category) {
      return errorResponse("No category provided");
    }

    if (!isValidCategory(category)) {
      return errorResponse("Invalid category");
    }

    // Get R2 bucket from environment
    const bucket = env.PORTFOLIO_BUCKET;
    if (!bucket) {
      return errorResponse("R2 bucket not available", {}, 500);
    }

    // List images from R2
    const images = await listImagesFromR2(bucket, category);

    return NextResponse.json({
      success: true,
      images,
    });
  } catch (error) {
    return errorResponse(
      `Unexpected error: ${
        error instanceof Error ? error.message : String(error)
      }`,
      {},
      500
    );
  }
}

// DELETE method to remove an image
export async function DELETE(
  request: NextRequest,
  { env }: { env: R2Environment }
) {
  try {
    // Parse JSON body
    const body = await request.json();
    const { src, category } = body;

    if (!src) {
      return errorResponse("No image source provided");
    }

    if (!category || !isValidCategory(category)) {
      return errorResponse("Invalid or missing category");
    }

    // Get R2 bucket from environment
    const bucket = env.PORTFOLIO_BUCKET;
    if (!bucket) {
      return errorResponse("R2 bucket not available", {}, 500);
    }

    // Delete from R2
    const success = await deleteFromR2(bucket, src);

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Image deleted successfully",
      });
    } else {
      return errorResponse("Failed to delete image", {}, 500);
    }
  } catch (error) {
    return errorResponse(
      `Unexpected error: ${
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
