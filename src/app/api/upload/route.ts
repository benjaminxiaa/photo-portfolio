// src/app/api/upload/route.ts
export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string | null;

    console.log("API: Mock upload request received");
    console.log("API: File type:", file?.type, "Category:", category);

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file provided" },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { success: false, message: "No category provided" },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ["nature", "wildlife", "architecture", "travel"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, message: "Invalid category" },
        { status: 400 }
      );
    }

    // Validate file is an image
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: "File must be an image (JPEG, PNG, or WebP)",
        },
        { status: 400 }
      );
    }

    // In Edge runtime, we can't write to the filesystem
    // For demo purposes, we'll just return a mock success response
    const fileName = file.name;
    const timestamp = Date.now();
    const mockFilePath = `/static/portfolio/${category}/${fileName.replace(
      /\.[^/.]+$/,
      ""
    )}-${timestamp}${fileName.match(/\.[^/.]+$/)?.[0] || ".jpg"}`;

    // Return mock success response
    return NextResponse.json({
      success: true,
      message: "File uploaded successfully (mock - Edge runtime)",
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
