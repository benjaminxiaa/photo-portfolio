// src/app/api/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// GitHub API response types
interface GitHubFileResponse {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  content?: string;
  encoding?: string;
}

// Helper for error responses
function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

// CORS handling
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// GitHub configuration - Store these in environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || "benjaminxiaa"; // Your GitHub username
const GITHUB_REPO = process.env.GITHUB_REPO || "photo-portoflio"; // Your existing repo name
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

// Get images for a category
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    
    if (!category) {
      return errorResponse("Category parameter is required");
    }
    
    // Validate category
    const validCategories = ['nature', 'wildlife', 'architecture', 'travel'];
    if (!validCategories.includes(category)) {
      return errorResponse("Invalid category");
    }
    
    // Get the contents of the category folder from GitHub
    const folderPath = `public/static/portfolio/${category}`;
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${folderPath}?ref=${GITHUB_BRANCH}`;
    
    console.log(`Fetching from GitHub: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `token ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28"
      }
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
    
    const contents = await response.json() as GitHubFileResponse[];
    
    // Filter for image files only
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const images = contents
      .filter((item: GitHubFileResponse) => 
        item.type === "file" && 
        imageExtensions.some(ext => item.name.toLowerCase().endsWith(ext))
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
          sha: item.sha // Store SHA for deletion later
        };
      });
    
    return NextResponse.json({
      success: true,
      images
    });
  } catch (error) {
    console.error("API Error:", error);
    return errorResponse(`Error processing request: ${error instanceof Error ? error.message : String(error)}`, 500);
  }
}

// Upload an image
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
    const validCategories = ['nature', 'wildlife', 'architecture', 'travel'];
    if (!validCategories.includes(category)) {
      return errorResponse("Invalid category");
    }
    
    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"];
    if (!validTypes.includes(file.type)) {
      return errorResponse("File must be an image (JPEG, PNG, WebP, GIF)");
    }
    
    // Read file as ArrayBuffer
    const buffer = await file.arrayBuffer();
    
    // Convert to base64
    const base64Content = Buffer.from(buffer).toString('base64');
    
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileName = file.name;
    const fileExt = fileName.match(/\.[^/.]+$/) || [".jpg"];
    const baseFileName = fileName.replace(/\.[^/.]+$/, "");
    const uniqueFileName = `${baseFileName}-${timestamp}${fileExt[0]}`;
    
    // Create the file path in the repo - match your existing structure
    const filePath = `public/static/portfolio/${category}/${uniqueFileName}`;
    
    console.log(`Uploading to GitHub: ${filePath}`);
    
    // Upload file to GitHub
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
    
    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `token ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Add ${uniqueFileName} to ${category}`,
        content: base64Content,
        branch: GITHUB_BRANCH
      })
    });
    
    if (!response.ok) {
      console.error(`GitHub upload error: ${response.status}`);
      const error = await response.text();
      return errorResponse(`GitHub API error: ${response.status} ${error}`);
    }
    
    // Parse response but we don't need to use the result
    await response.json();
    
    // Update the corresponding page.tsx file to include the new image
    const pagePath = `src/app/photo/${category}/page.tsx`;
    const pageUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${pagePath}?ref=${GITHUB_BRANCH}`;
    
    const pageResponse = await fetch(pageUrl, {
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `token ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
    
    if (!pageResponse.ok) {
      console.error(`Failed to get page file: ${pageResponse.status}`);
      // Continue anyway, we still uploaded the image successfully
      return NextResponse.json({
        success: true,
        message: "File uploaded successfully, but failed to update page file",
        filePath: `/static/portfolio/${category}/${uniqueFileName}`
      });
    }
    
    const pageData = await pageResponse.json() as GitHubFileResponse;
    const content = Buffer.from(pageData.content || "", 'base64').toString('utf8');
    
    // Determine image dimensions for the new entry
    let width = 1000;
    let height = 800;
    
    // Try to extract dimensions from filename if format is like "image-1200x800.jpg"
    const dimensionsMatch = uniqueFileName.match(/(\d+)x(\d+)/);
    if (dimensionsMatch) {
      width = parseInt(dimensionsMatch[1], 10);
      height = parseInt(dimensionsMatch[2], 10);
    }
    
    // Find the images array in the file
    const imagesArrayMatch = content.match(/const images = \[([\s\S]*?)\];/);
    
    if (!imagesArrayMatch) {
      console.error("Couldn't find images array in page file");
      return NextResponse.json({
        success: true,
        message: "File uploaded successfully, but failed to update page file",
        filePath: `/static/portfolio/${category}/${uniqueFileName}`
      });
    }
    
    // Create the new image entry
    const newImageEntry = `
    {
      src: "/static/portfolio/${category}/${uniqueFileName}",
      width: ${width},
      height: ${height}
    },`;
    
    // Insert the new image at the beginning of the array
    const updatedContent = content.replace(
      'const images = [',
      'const images = [' + newImageEntry
    );
    
    // Commit the updated page file
    const updateResponse = await fetch(pageUrl, {
      method: "PUT",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `token ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Add ${uniqueFileName} to ${category} gallery`,
        content: Buffer.from(updatedContent).toString('base64'),
        sha: pageData.sha,
        branch: GITHUB_BRANCH
      })
    });
    
    if (!updateResponse.ok) {
      console.error(`Failed to update page file: ${updateResponse.status}`);
      return NextResponse.json({
        success: true,
        message: "File uploaded successfully, but failed to update page file",
        filePath: `/static/portfolio/${category}/${uniqueFileName}`
      });
    }
    
    return NextResponse.json({
      success: true,
      message: "File uploaded successfully and gallery updated",
      filePath: `/static/portfolio/${category}/${uniqueFileName}`
    });
  } catch (error) {
    console.error("API Upload error:", error);
    return errorResponse(`Error uploading file: ${error instanceof Error ? error.message : String(error)}`, 500);
  }
}

// Delete an image
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
    const validCategories = ['nature', 'wildlife', 'architecture', 'travel'];
    if (!validCategories.includes(category)) {
      return errorResponse("Invalid category");
    }
    
    // Extract filename from src
    const filename = src.split('/').pop();
    
    if (!filename) {
      return errorResponse("Invalid image source path");
    }
    
    // Step 1: Remove the file entry from the page.tsx file
    const pagePath = `src/app/photo/${category}/page.tsx`;
    const pageUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${pagePath}?ref=${GITHUB_BRANCH}`;
    
    console.log(`Getting page file: ${pagePath}`);
    
    const pageResponse = await fetch(pageUrl, {
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `token ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
    
    if (!pageResponse.ok) {
      console.error(`Failed to get page file: ${pageResponse.status}`);
      return errorResponse(`Failed to get page file: ${pageResponse.status}`);
    }
    
    const pageData = await pageResponse.json() as GitHubFileResponse;
    const content = Buffer.from(pageData.content || "", 'base64').toString('utf8');
    
    // Escape special characters in the source path for regex
    const escapedSrc = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create patterns to match the image object in different scenarios
    const patternWithComma = new RegExp(`\\s*{[\\s\\S]*?src:\\s*["']${escapedSrc}["'][\\s\\S]*?}\\s*,`, 'g');
    const patternWithoutComma = new RegExp(`\\s*{[\\s\\S]*?src:\\s*["']${escapedSrc}["'][\\s\\S]*?}\\s*(?=\\])`, 'g');
    
    // Check if the patterns match in the content
    let updatedContent = content;
    if (patternWithComma.test(content)) {
      // Reset lastIndex before using replace
      patternWithComma.lastIndex = 0;
      updatedContent = content.replace(patternWithComma, '');
    } else if (patternWithoutComma.test(content)) {
      // Reset lastIndex before using replace
      patternWithoutComma.lastIndex = 0;
      updatedContent = content.replace(patternWithoutComma, '');
    } else {
      console.log("Image reference not found in page file");
      // Continue with file deletion anyway
    }
    
    // Clean up the array (fix double commas or trailing commas)
    updatedContent = updatedContent
      .replace(/,\s*,/g, ',')  // Fix double commas
      .replace(/\[\s*,/g, '[') // Fix comma after opening bracket
      .replace(/,\s*\]/g, ']'); // Fix comma before closing bracket
    
    if (updatedContent !== content) {
      console.log("Updating page file with image removed");
      
      // Commit the updated page file
      const updateResponse = await fetch(pageUrl, {
        method: "PUT",
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": `token ${GITHUB_TOKEN}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `Remove ${filename} from ${category} gallery`,
          content: Buffer.from(updatedContent).toString('base64'),
          sha: pageData.sha,
          branch: GITHUB_BRANCH
        })
      });
      
      if (!updateResponse.ok) {
        console.error(`Failed to update page file: ${updateResponse.status}`);
        const errorText = await updateResponse.text();
        console.error(errorText);
        // Continue with file deletion anyway
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Image removed from gallery"
    });
  } catch (error) {
    console.error("API Delete error:", error);
    return errorResponse(`Error deleting image: ${error instanceof Error ? error.message : String(error)}`, 500);
  }
}