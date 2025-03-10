// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";
import fs from "fs";
import sharp from "sharp";

// Type definitions
interface UploadResponse {
  success: boolean;
  message: string;
  filePath?: string;
}

interface GalleryImage {
  src: string;
  width: number;
  height: number;
}

type Category = "nature" | "wildlife" | "architecture" | "travel";

// Explicitly set Node.js runtime
export const runtime = "nodejs";

export async function POST(
  request: NextRequest
): Promise<NextResponse<UploadResponse>> {
  try {
    console.log("API: Upload request received");
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as Category | null;

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
    const validCategories: Category[] = [
      "nature",
      "wildlife",
      "architecture",
      "travel",
    ];
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

    // Convert to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Process image with sharp
    const image = sharp(buffer);
    const metadata = await image.metadata();
    console.log("API: Image dimensions:", metadata.width, "x", metadata.height);

    // Create directory if it doesn't exist
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "static",
      "portfolio",
      category
    );
    await mkdir(uploadDir, { recursive: true });
    console.log("API: Upload directory ensured:", uploadDir);

    // Generate unique filename
    const originalName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
    const fileExt = path.extname(file.name).toLowerCase();
    const timestamp = Date.now();
    const filename = `${originalName}-${timestamp}${fileExt}`;
    const filepath = path.join(uploadDir, filename);
    console.log("API: Target filepath:", filepath);

    // Write file to disk
    await writeFile(filepath, buffer);
    console.log("API: File written to disk");

    // Get relative path for database
    const relativePath = `/static/portfolio/${category}/${filename}`;

    // Update images data in the appropriate page file
    await updateImagesData(category, {
      src: relativePath,
      width: metadata.width || 1000,
      height: metadata.height || 1000,
    });

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      filePath: relativePath,
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

async function updateImagesData(
  category: Category,
  newImage: GalleryImage
): Promise<boolean> {
  try {
    console.log("API: Updating images data for category:", category);
    let pagePath: string;

    // Map category to actual page path
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
        throw new Error("Invalid category");
    }

    console.log("API: Reading page file:", pagePath);

    // Check if file exists
    if (!fs.existsSync(pagePath)) {
      console.log("API: Page file not found");
      throw new Error("Page file not found");
    }

    // Read the current file content
    const content = await readFile(pagePath, "utf8");

    // Find the images array in the file
    const imagesArrayStart = content.indexOf("const images = [");
    const imagesArrayEnd = content.indexOf("];", imagesArrayStart) + 1;

    if (imagesArrayStart === -1 || imagesArrayEnd === 0) {
      console.log("API: Could not find images array in file");
      throw new Error("Failed to find images array in page file");
    }

    // Extract the images array
    const imagesArrayString = content.substring(
      imagesArrayStart,
      imagesArrayEnd
    );
    console.log("API: Found images array of length:", imagesArrayString.length);

    // Create the new image entry string
    const newImageEntry = `
    {
      src: "${newImage.src}",
      width: ${newImage.width},
      height: ${newImage.height}
    },`;

    // Insert the new image at the beginning of the array (after the opening bracket and newline)
    const updatedImagesArrayString = imagesArrayString.replace(
      "const images = [",
      "const images = [" + newImageEntry
    );

    console.log(
      "API: Updated images array length:",
      updatedImagesArrayString.length
    );

    // Replace the old images array with the updated one
    const updatedContent =
      content.substring(0, imagesArrayStart) +
      updatedImagesArrayString +
      content.substring(imagesArrayEnd);

    // Write the updated content back to the file
    await writeFile(pagePath, updatedContent, "utf8");
    console.log("API: Successfully updated page file");

    return true;
  } catch (error) {
    console.error("API Error updating images data:", error);
    throw error;
  }
}
