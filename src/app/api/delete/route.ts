// src/app/api/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import fs from "fs";

export const runtime = 'nodejs';

// Type definitions
interface DeleteRequest {
  src: string;
  category: Category;
}

interface ApiResponse {
  success: boolean;
  message: string;
}

type Category = "nature" | "wildlife" | "architecture" | "travel";

export async function DELETE(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    // Parse the request body
    const body = (await request.json()) as DeleteRequest;
    const { src, category } = body;

    console.log("API Delete: Starting delete operation (code only)");
    console.log("API Delete: Image source:", src);
    console.log("API Delete: Category:", category);

    // Basic validation
    if (!src) {
      console.log("API Delete: Missing image source");
      return NextResponse.json(
        { success: false, message: "Image source is required" },
        { status: 400 }
      );
    }

    if (!category) {
      console.log("API Delete: Missing category");
      return NextResponse.json(
        { success: false, message: "Category is required" },
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
      console.log("API Delete: Invalid category:", category);
      return NextResponse.json(
        { success: false, message: "Invalid category" },
        { status: 400 }
      );
    }

    // Get page file path based on category
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
        console.log("API Delete: Invalid category (switch default case)");
        return NextResponse.json(
          { success: false, message: "Invalid category" },
          { status: 400 }
        );
    }

    console.log("API Delete: Reading page file:", pagePath);

    // Check if page file exists
    if (!fs.existsSync(pagePath)) {
      console.log("API Delete: Page file not found");
      return NextResponse.json(
        { success: false, message: "Page file not found" },
        { status: 404 }
      );
    }

    // Read the current file content
    let content: string;
    try {
      content = await readFile(pagePath, "utf8");
      console.log(
        "API Delete: Successfully read page file, length:",
        content.length
      );
    } catch (readError) {
      console.error("API Delete: Error reading page file:", readError);
      return NextResponse.json(
        {
          success: false,
          message: `Error reading page file: ${
            readError instanceof Error ? readError.message : String(readError)
          }`,
        },
        { status: 500 }
      );
    }

    // Find the images array
    const imagesArrayStart = content.indexOf("const images = [");
    const imagesArrayEnd = content.indexOf("];", imagesArrayStart) + 1;

    if (imagesArrayStart === -1 || imagesArrayEnd === 0) {
      console.log("API Delete: Could not find images array in file");
      return NextResponse.json(
        { success: false, message: "Failed to find images array in page file" },
        { status: 500 }
      );
    }

    // Extract the images array
    const imagesArrayString = content.substring(
      imagesArrayStart,
      imagesArrayEnd
    );
    console.log(
      "API Delete: Found images array, length:",
      imagesArrayString.length
    );

    // Escape special characters in the src path for regex
    const srcForRegex = src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    console.log("API Delete: Escaped src for regex:", srcForRegex);

    // Create a pattern that will match the image object with the given src
    // This handles variations in whitespace and formatting
    const imageObjectPattern = `\\s*{[\\s\\S]*?src:\\s*["']${srcForRegex}["'][\\s\\S]*?width:\\s*\\d+[\\s\\S]*?height:\\s*\\d+[\\s\\S]*?}`;

    // To handle both cases - with and without trailing comma
    const patternWithComma = new RegExp(`(${imageObjectPattern}),`, "g");
    const patternWithoutComma = new RegExp(
      `(${imageObjectPattern})(?=[\\s\\n]*])`,
      "g"
    );

    console.log("API Delete: Checking for image in code");

    // Test if the image exists in the array
    const hasImageWithComma = patternWithComma.test(imagesArrayString);
    patternWithComma.lastIndex = 0; // Reset lastIndex

    const hasImageWithoutComma = patternWithoutComma.test(imagesArrayString);
    patternWithoutComma.lastIndex = 0; // Reset lastIndex

    if (!hasImageWithComma && !hasImageWithoutComma) {
      console.log("API Delete: Image not found in code");
      return NextResponse.json(
        { success: false, message: "Image not found in code" },
        { status: 404 }
      );
    }

    console.log("API Delete: Image found in code, removing...");

    // Replace the image object in the array
    let updatedImagesArrayString: string;

    if (hasImageWithComma) {
      // Replace with empty string if it has a comma
      updatedImagesArrayString = imagesArrayString.replace(
        patternWithComma,
        ""
      );
    } else {
      // Replace without trailing comma
      updatedImagesArrayString = imagesArrayString.replace(
        patternWithoutComma,
        ""
      );
    }

    // Fix any malformed array that might have been created (like double commas)
    updatedImagesArrayString = updatedImagesArrayString
      .replace(/,\s*,/g, ",") // Replace double commas with single comma
      .replace(/\[\s*,/g, "[") // Remove comma after opening bracket
      .replace(/,\s*]/g, "]"); // Remove comma before closing bracket

    console.log(
      "API Delete: Updated images array, length:",
      updatedImagesArrayString.length
    );

    // Create the updated content
    const updatedContent =
      content.substring(0, imagesArrayStart) +
      updatedImagesArrayString +
      content.substring(imagesArrayEnd);

    // Write the updated content back to the file
    try {
      await writeFile(pagePath, updatedContent, "utf8");
      console.log("API Delete: Successfully updated page file");
    } catch (writeError) {
      console.error("API Delete: Error writing page file:", writeError);
      return NextResponse.json(
        {
          success: false,
          message: `Error updating page file: ${
            writeError instanceof Error
              ? writeError.message
              : String(writeError)
          }`,
        },
        { status: 500 }
      );
    }

    console.log("API Delete: Operation completed successfully");

    return NextResponse.json({
      success: true,
      message: "Image reference removed successfully",
    });
  } catch (error) {
    console.error("API Delete: Unhandled error:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Error removing image reference: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 }
    );
  }
}
