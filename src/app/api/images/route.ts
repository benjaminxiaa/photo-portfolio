// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// Type definitions
interface UploadResponse {
  success: boolean;
  message: string;
  filePath?: string;
}

type Category = "nature" | "wildlife" | "architecture" | "travel";

export async function POST(
  request: NextRequest
): Promise<NextResponse<UploadResponse>> {
  try {
    console.log("API Upload: Starting upload operation (Edge Runtime)");
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as Category | null;

    console.log("API Upload: File type:", file?.type, "Category:", category);

    // Validation checks
    if (!file) {
      console.log("API Upload: No file provided");
      return NextResponse.json(
        { success: false, message: "No file provided" },
        { status: 400 }
      );
    }

    if (!category) {
      console.log("API Upload: No category provided");
      return NextResponse.json(
        { success: false, message: "No category provided" },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories: Category[] = [
      "nature",
      "wildlife",
      "architecture",
      "travel",
    ];
    if (!validCategories.includes(category)) {
      console.log("API Upload: Invalid category:", category);
      return NextResponse.json(
        { success: false, message: "Invalid category" },
        { status: 400 }
      );
    }

    // Validate file is an image
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      console.log("API Upload: Invalid file type:", file.type);
      return NextResponse.json(
        {
          success: false,
          message: "File must be an image (JPEG, PNG, or WebP)",
        },
        { status: 400 }
      );
    }

    // Get file information
    const fileName = file.name;
    const fileSize = file.size;

    // Generate a placeholder path that would have been used in Node.js environment
    const timestamp = Date.now();
    const fileExt = fileName.match(/\.[^/.]+$/) || [".jpg"];
    const baseFileName = fileName.replace(/\.[^/.]+$/, "");
    const uniqueFileName = `${baseFileName}-${timestamp}${fileExt[0]}`;
    const mockFilePath = `/static/portfolio/${category}/${uniqueFileName}`;

    console.log("API Upload: Simulated path:", mockFilePath);
    console.log("API Upload: File size:", fileSize, "bytes");

    // Return a successful response
    // In a real implementation, we would write the file to disk and update the page.tsx file
    return NextResponse.json({
      success: true,
      message: "File upload simulated in Edge Runtime (no actual file saved)",
      filePath: mockFilePath,
    });
  } catch (error) {
    console.error("API Upload error:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Error uploading file: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 }
    );
  }
}
