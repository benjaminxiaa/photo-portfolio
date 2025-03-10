// src/app/api/images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

// Type definitions
interface GalleryImage {
  src: string;
  width: number;
  height: number;
}

interface ApiResponse {
  success: boolean;
  message?: string;
}

interface ImagesResponse extends ApiResponse {
  images: GalleryImage[];
}

type Category = "nature" | "wildlife" | "architecture" | "travel";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ImagesResponse>> {
  try {
    // Get the category from query params
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as Category | null;

    console.log("API: Fetching images for category:", category);

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: "Category parameter is required",
          images: [],
        },
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
      return NextResponse.json(
        { success: false, message: "Invalid category", images: [] },
        { status: 400 }
      );
    }

    // Map category to page path
    let pagePath: string;
    switch (category) {
      case "nature":
        pagePath = path.join(
          process.cwd(),
          "src",
          "app",
          "photo",
          "nature",
          "page.tsx"
        );
        break;
      case "wildlife":
        pagePath = path.join(
          process.cwd(),
          "src",
          "app",
          "photo",
          "wildlife",
          "page.tsx"
        );
        break;
      case "architecture":
        pagePath = path.join(
          process.cwd(),
          "src",
          "app",
          "photo",
          "architecture",
          "page.tsx"
        );
        break;
      case "travel":
        pagePath = path.join(
          process.cwd(),
          "src",
          "app",
          "photo",
          "travel",
          "page.tsx"
        );
        break;
      default:
        return NextResponse.json(
          { success: false, message: "Invalid category", images: [] },
          { status: 400 }
        );
    }

    console.log("API: Reading page file at:", pagePath);

    // Check if file exists
    if (!fs.existsSync(pagePath)) {
      console.log("API: Page file not found");
      return NextResponse.json(
        { success: false, message: "Page file not found", images: [] },
        { status: 404 }
      );
    }

    // Read the file content
    const content = await readFile(pagePath, "utf8");
    console.log("API: File content length:", content.length);

    // Extract the images array using regex
    const imagesArrayMatch = content.match(/const images = \[([\s\S]*?)\];/);

    if (!imagesArrayMatch || !imagesArrayMatch[1]) {
      console.log("API: Failed to extract images array");
      return NextResponse.json(
        {
          success: false,
          message: "Failed to extract images array from page file",
          images: [],
        },
        { status: 500 }
      );
    }

    // Parse the images array
    const imagesArrayString = imagesArrayMatch[1];
    console.log("API: Images array string length:", imagesArrayString.length);

    // Extract individual image objects
    const imageRegex =
      /{[\s\S]*?src:[\s\S]*?["']([\s\S]*?)["'][\s\S]*?width:[\s\S]*?(\d+)[\s\S]*?height:[\s\S]*?(\d+)[\s\S]*?}/g;
    let match: RegExpExecArray | null;
    const images: GalleryImage[] = [];

    // Use the regex to extract each match
    while ((match = imageRegex.exec(imagesArrayString)) !== null) {
      images.push({
        src: match[1],
        width: parseInt(match[2], 10),
        height: parseInt(match[3], 10),
      });
    }

    console.log("API: Successfully extracted images:", images.length);

    return NextResponse.json({
      success: true,
      images,
    });
  } catch (error) {
    console.error("API Error fetching images:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Error fetching images: ${
          error instanceof Error ? error.message : String(error)
        }`,
        images: [],
      },
      { status: 500 }
    );
  }
}
