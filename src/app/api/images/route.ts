// src/app/api/images/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// GitHub configuration - Store these in environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || "benjaminxiaa";
const GITHUB_REPO = process.env.GITHUB_REPO || "photo-portfolio";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

// Helper for error responses
function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

// GitHub API response types
interface GitHubFileResponse {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: string;
  content?: string;
  encoding?: string;
}

// Validate category
function isValidCategory(category: string): boolean {
  const validCategories = ["nature", "wildlife", "architecture", "travel"];
  return validCategories.includes(category);
}

// GET method to fetch images
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    if (!category) {
      return errorResponse("Category parameter is required");
    }

    if (!isValidCategory(category)) {
      return errorResponse("Invalid category");
    }

    // Get the contents of the category folder from GitHub
    const folderPath = `public/static/portfolio/${category}`;
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${folderPath}?ref=${GITHUB_BRANCH}`;

    console.log(`Fetching from GitHub: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `token ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      console.error(`GitHub API error: ${response.status}`);

      if (response.status === 404) {
        // Folder might not exist yet, return empty array
        return NextResponse.json({ success: true, images: [] });
      }

      const error = await response.text();
      return errorResponse(`GitHub API error: ${response.status} ${error}`);
    }

    const contents = (await response.json()) as GitHubFileResponse[];

    // Filter for image files only
    const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    const images = contents
      .filter(
        (item: GitHubFileResponse) =>
          item.type === "file" &&
          imageExtensions.some((ext) => item.name.toLowerCase().endsWith(ext))
      )
      .map((item: GitHubFileResponse) => {
        // Extract dimensions or use defaults
        let width = 1000;
        let height = 800;

        // Try to get dimensions from filename if they're stored that way (e.g., image-1200x800.jpg)
        const dimensionsMatch = item.name.match(/(\d+)x(\d+)/);
        if (dimensionsMatch) {
          width = parseInt(dimensionsMatch[1], 10);
          height = parseInt(dimensionsMatch[2], 10);
        }

        return {
          src: `/static/portfolio/${category}/${item.name}`,
          width,
          height,
          sha: item.sha, // Store SHA for deletion later
        };
      });

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

// POST method to upload image
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
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

    const response = await fetch(apiUrl, {
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

    if (!response.ok) {
      console.error(`GitHub upload error: ${response.status}`);
      const error = await response.text();
      return errorResponse(`GitHub API error: ${response.status} ${error}`);
    }

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      filePath: `/static/portfolio/${category}/${uniqueFileName}`,
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

// DELETE method to remove image
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

    return NextResponse.json({
      success: true,
      message: "Image deleted successfully",
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
