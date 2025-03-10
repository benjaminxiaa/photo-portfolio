// src/app/api/images/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || "benjaminxiaa";
const GITHUB_REPO = process.env.GITHUB_REPO || "photo-portfolio";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

// Validate category
function isValidCategory(category: string): boolean {
  const validCategories = ["nature", "wildlife", "architecture", "travel"];
  return validCategories.includes(category);
}

// Helper for error responses
function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

// GitHub API response types
interface GitHubFileResponse {
  name: string;
  path: string;
  sha: string;
  content?: string;
  encoding?: string;
}

// Parse images from page.tsx content
function extractImagesFromPageContent(content: string): any[] {
  try {
    // Decode base64 content
    const decodedContent = Buffer.from(content, "base64").toString("utf-8");

    // Extract the images array using a regex
    const imagesMatch = decodedContent.match(/const images = \[([\s\S]*?)];/);

    if (!imagesMatch) {
      console.error("Could not find images array in page content");
      return [];
    }

    // Use eval-like parsing (safely processed)
    const imagesArrayStr = `[${imagesMatch[1]}]`;
    const parsedImages = JSON.parse(
      imagesArrayStr.replace(/\n/g, "").replace(/\s+/g, " ")
    );

    return parsedImages;
  } catch (error) {
    console.error("Error parsing images:", error);
    return [];
  }
}

// Modify page.tsx file to add or remove an image
async function updatePageFile(
  category: string,
  action: "add" | "remove",
  imagePath: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get the current page.tsx file
    const pagePath = `src/app/photo/${category}/page.tsx`;
    const pageUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${pagePath}?ref=${GITHUB_BRANCH}`;

    const pageResponse = await fetch(pageUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `token ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!pageResponse.ok) {
      console.error(`Failed to get page file: ${pageResponse.status}`);
      return {
        success: false,
        message: `Failed to get page file: ${pageResponse.status}`,
      };
    }

    const pageData = (await pageResponse.json()) as GitHubFileResponse;
    const content = Buffer.from(pageData.content || "", "base64").toString(
      "utf8"
    );

    let updatedContent;
    if (action === "add") {
      // Prepare new image entry with default dimensions
      const newImageEntry = `
    {
      src: "${imagePath}",
      width: 1000,
      height: 800
    },`;

      // Insert the new image at the beginning of the array
      updatedContent = content.replace(
        "const images = [",
        "const images = [" + newImageEntry
      );
    } else {
      // Remove image
      // Escape special characters in the source path for regex
      const escapedSrc = imagePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      // Create patterns to match the image object in different scenarios
      const patternWithComma = new RegExp(
        `\\s*{[\\s\\S]*?src:\\s*["']${escapedSrc}["'][\\s\\S]*?}\\s*,`,
        "g"
      );
      const patternWithoutComma = new RegExp(
        `\\s*{[\\s\\S]*?src:\\s*["']${escapedSrc}["'][\\s\\S]*?}\\s*(?=\\])`,
        "g"
      );

      if (patternWithComma.test(content)) {
        patternWithComma.lastIndex = 0;
        updatedContent = content.replace(patternWithComma, "");
      } else if (patternWithoutComma.test(content)) {
        patternWithoutComma.lastIndex = 0;
        updatedContent = content.replace(patternWithoutComma, "");
      } else {
        console.log("Image reference not found in page file");
        return { success: false, message: "Image not found in gallery" };
      }

      // Clean up formatting
      updatedContent = updatedContent
        .replace(/,\s*,/g, ",") // Fix double commas
        .replace(/\[\s*,/g, "[") // Fix comma after opening bracket
        .replace(/,\s*\]/g, "]"); // Fix comma before closing bracket
    }

    // Commit the updated page file
    const updateResponse = await fetch(pageUrl, {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `token ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `${
          action === "add" ? "Add" : "Remove"
        } image from ${category} gallery`,
        content: Buffer.from(updatedContent).toString("base64"),
        sha: pageData.sha,
        branch: GITHUB_BRANCH,
      }),
    });

    if (!updateResponse.ok) {
      console.error(`Failed to update page file: ${updateResponse.status}`);
      const errorText = await updateResponse.text();
      return {
        success: false,
        message: `Failed to update page file: ${updateResponse.status} ${errorText}`,
      };
    }

    return {
      success: true,
      message: `Image ${action === "add" ? "added" : "removed"} successfully`,
    };
  } catch (error) {
    console.error("Error updating page file:", error);
    return {
      success: false,
      message: `Error updating page file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

// GET method to fetch images
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    console.log("Received category:", category);

    if (!category) {
      return errorResponse("Category parameter is required");
    }

    if (!isValidCategory(category)) {
      return errorResponse("Invalid category");
    }

    // Get the page.tsx file for the category
    const pagePath = `src/app/photo/${category}/page.tsx`;
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${pagePath}?ref=${GITHUB_BRANCH}`;

    console.log(`Fetching from GitHub: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `token ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    console.log("GitHub API Response Status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GitHub API error: ${response.status}`, errorText);

      if (response.status === 404) {
        return errorResponse(`Category page not found: ${category}`);
      }

      return errorResponse(`GitHub API error: ${response.status} ${errorText}`);
    }

    const pageData = (await response.json()) as GitHubFileResponse;

    // Extract images from page content
    const images = extractImagesFromPageContent(pageData.content || "");

    return NextResponse.json({
      success: true,
      images,
    });
  } catch (error) {
    console.error("API Error:", error);
    return errorResponse(
      `Error processing request: ${
        error instanceof Error ? error.message : String(error)
      }`,
      500
    );
  }
}

// POST method to add an image
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
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
      return errorResponse("Invalid category");
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
      return errorResponse("File must be an image (JPEG, PNG, WebP, GIF)");
    }

    // Read file as ArrayBuffer
    const buffer = await file.arrayBuffer();

    // Convert to base64
    const base64Content = Buffer.from(buffer).toString("base64");

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileName = file.name;
    const fileExt = fileName.match(/\.[^/.]+$/) || [".jpg"];
    const baseFileName = fileName.replace(/\.[^/.]+$/, "");
    const uniqueFileName = `${baseFileName}-${timestamp}${fileExt[0]}`;

    // Create the file path in the repo
    const filePath = `public/static/portfolio/${category}/${uniqueFileName}`;

    console.log(`Uploading to GitHub: ${filePath}`);

    // Upload file to GitHub
    const uploadUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `token ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Add ${uniqueFileName} to ${category}`,
        content: base64Content,
        branch: GITHUB_BRANCH,
      }),
    });

    if (!uploadResponse.ok) {
      console.error(`GitHub upload error: ${uploadResponse.status}`);
      const error = await uploadResponse.text();
      return errorResponse(
        `GitHub API error: ${uploadResponse.status} ${error}`
      );
    }

    // Update the page.tsx file to include the new image
    const imageSrc = `/static/portfolio/${category}/${uniqueFileName}`;
    const updateResult = await updatePageFile(category, "add", imageSrc);

    if (!updateResult.success) {
      return errorResponse(updateResult.message);
    }

    return NextResponse.json({
      success: true,
      message: "File uploaded and gallery updated successfully",
      filePath: imageSrc,
    });
  } catch (error) {
    console.error("API Upload error:", error);
    return errorResponse(
      `Error uploading file: ${
        error instanceof Error ? error.message : String(error)
      }`,
      500
    );
  }
}

// DELETE method to remove an image
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { src, category } = body;

    if (!src) {
      return errorResponse("Image source is required");
    }

    if (!category) {
      return errorResponse("Category is required");
    }

    // Validate category
    if (!isValidCategory(category)) {
      return errorResponse("Invalid category");
    }

    // Extract filename from src
    const filename = src.split("/").pop();

    if (!filename) {
      return errorResponse("Invalid image source path");
    }

    // Construct full file path
    const filePath = `public/static/portfolio/${category}/${filename}`;

    // First, get the current file's SHA
    const getFileUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`;

    const getResponse = await fetch(getFileUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `token ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!getResponse.ok) {
      console.error(`Failed to get file: ${getResponse.status}`);
      return errorResponse(`Failed to get file: ${getResponse.status}`);
    }

    const fileData = (await getResponse.json()) as GitHubFileResponse;

    // Delete the file
    const deleteUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

    const deleteResponse = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `token ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Remove ${filename} from ${category}`,
        sha: fileData.sha,
        branch: GITHUB_BRANCH,
      }),
    });

    if (!deleteResponse.ok) {
      console.error(`Failed to delete file: ${deleteResponse.status}`);
      const error = await deleteResponse.text();
      return errorResponse(
        `GitHub API error: ${deleteResponse.status} ${error}`
      );
    }

    // Remove the image from the page.tsx file
    const updateResult = await updatePageFile(category, "remove", src);

    if (!updateResult.success) {
      return errorResponse(updateResult.message);
    }

    return NextResponse.json({
      success: true,
      message: "Image deleted from gallery successfully",
    });
  } catch (error) {
    console.error("API Delete error:", error);
    return errorResponse(
      `Error deleting image: ${
        error instanceof Error ? error.message : String(error)
      }`,
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
