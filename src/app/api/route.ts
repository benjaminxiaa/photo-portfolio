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

// GitHub configuration from environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || ""; 
const GITHUB_REPO = process.env.GITHUB_REPO || "";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

// Cloudflare-specific headers helper
function getGitHubHeaders() {
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `token ${GITHUB_TOKEN}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "CloudflarePages/1.0" // This can help with GitHub API requests
  };
}

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
    // Using both /public/static and /static paths to handle different directory structures
    const folderPaths = [
      `public/static/portfolio/${category}`,
      `static/portfolio/${category}`
    ];
    
    // Try both paths, use the first one that works
    let contents: GitHubFileResponse[] = [];
    let foundValidPath = false;
    
    for (const folderPath of folderPaths) {
      if (foundValidPath) break;
      
      const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${folderPath}?ref=${GITHUB_BRANCH}`;
      
      console.log(`Trying to fetch from GitHub: ${apiUrl}`);
      
      try {
        const response = await fetch(apiUrl, {
          headers: getGitHubHeaders()
        });
        
        if (response.ok) {
          contents = await response.json() as GitHubFileResponse[];
          foundValidPath = true;
          console.log(`Successfully found images at: ${folderPath}`);
        } else if (response.status !== 404) {
          // If we get any error other than 404, report it
          console.error(`GitHub API error: ${response.status}`);
          const error = await response.text();
          return errorResponse(`GitHub API error: ${response.status} ${error}`);
        }
      } catch (error) {
        console.error(`Error fetching from ${folderPath}:`, error);
      }
    }
    
    if (!foundValidPath) {
      // No valid path found, return empty array
      return NextResponse.json({ success: true, images: [] });
    }
    
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
        
        // Determine which path we're using
        const basePath = foundValidPath && folderPaths[0].startsWith('public/') 
          ? `/static/portfolio/${category}/${item.name}`
          : `/portfolio/${category}/${item.name}`;
        
        return {
          src: basePath,
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
    
    // Determine folder path - try both /public/static and /static
    const filePaths = [
      `public/static/portfolio/${category}/${uniqueFileName}`,
      `static/portfolio/${category}/${uniqueFileName}`
    ];
    
    // Try to determine which path exists in the repo
    let existingPathPrefix = '';
    
    try {
      // Check if public/static exists
      const publicStaticResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/public/static?ref=${GITHUB_BRANCH}`,
        { headers: getGitHubHeaders() }
      );
      
      if (publicStaticResponse.ok) {
        existingPathPrefix = 'public/static';
      } else {
        // Check if static exists
        const staticResponse = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/static?ref=${GITHUB_BRANCH}`,
          { headers: getGitHubHeaders() }
        );
        
        if (staticResponse.ok) {
          existingPathPrefix = 'static';
        }
      }
    } catch (error) {
      console.error("Error checking folder paths:", error);
    }
    
    // Use the path we found or default to the first one
    const filePath = existingPathPrefix 
      ? `${existingPathPrefix}/portfolio/${category}/${uniqueFileName}`
      : filePaths[0];
    
    console.log(`Uploading to GitHub: ${filePath}`);
    
    // Upload file to GitHub
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
    
    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        ...getGitHubHeaders(),
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
    
    try {
      const pageResponse = await fetch(pageUrl, {
        headers: getGitHubHeaders()
      });
      
      if (pageResponse.ok) {
        const pageData = await pageResponse.json() as GitHubFileResponse;
        const content = Buffer.from(pageData.content || "", 'base64').toString('utf8');
        
        // Determine image dimensions for the new entry
        let width = 1000;
        let height = 800;
        
        // Build src path based on the path we used
        const srcPath = existingPathPrefix && existingPathPrefix.startsWith('public/')
          ? `/static/portfolio/${category}/${uniqueFileName}`
          : `/portfolio/${category}/${uniqueFileName}`;
        
        // Find the images array in the file
        const imagesArrayMatch = content.match(/const images = \[([\s\S]*?)\];/);
        
        if (imagesArrayMatch) {
          // Create the new image entry
          const newImageEntry = `
    {
      src: "${srcPath}",
      width: ${width},
      height: ${height},
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
              ...getGitHubHeaders(),
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
          }
        }
      }
    } catch (error) {
      console.error("Error updating page file:", error);
    }
    
    return NextResponse.json({
      success: true,
      message: "File uploaded successfully and gallery updated",
      filePath: existingPathPrefix && existingPathPrefix.startsWith('public/')
        ? `/static/portfolio/${category}/${uniqueFileName}`
        : `/portfolio/${category}/${uniqueFileName}`
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
    
    // First, try to update the page.tsx file to remove the image reference
    try {
      const pagePath = `src/app/photo/${category}/page.tsx`;
      const pageUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${pagePath}?ref=${GITHUB_BRANCH}`;
      
      const pageResponse = await fetch(pageUrl, {
        headers: getGitHubHeaders()
      });
      
      if (pageResponse.ok) {
        const pageData = await pageResponse.json() as GitHubFileResponse;
        const content = Buffer.from(pageData.content || "", 'base64').toString('utf8');
        
        // Escape special characters in the source path for regex
        const escapedSrc = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Create a pattern that will match the entire image object
        const pattern = new RegExp(`\\s*{[\\s\\S]*?src:\\s*["']${escapedSrc}["'][\\s\\S]*?}\\s*,?`, 'g');
        
        // Check if the pattern matches in the content
        if (pattern.test(content)) {
          // Reset lastIndex before using replace
          pattern.lastIndex = 0;
          let updatedContent = content.replace(pattern, '');
          
          // Clean up the array (fix double commas or trailing commas)
          updatedContent = updatedContent
            .replace(/,\s*,/g, ',')  // Fix double commas
            .replace(/\[\s*,/g, '[') // Fix comma after opening bracket
            .replace(/,\s*\]/g, ']'); // Fix comma before closing bracket
          
          // Commit the updated page file
          const updateResponse = await fetch(pageUrl, {
            method: "PUT",
            headers: {
              ...getGitHubHeaders(),
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
          }
        }
      }
    } catch (error) {
      console.error("Error updating page file:", error);
    }
    
    // Now try to delete the actual file
    // We need to determine which path the file is located at
    let fileFound = false;
    const possiblePaths = [
      `public/static/portfolio/${category}/${filename}`,
      `static/portfolio/${category}/${filename}`
    ];
    
    for (const path of possiblePaths) {
      if (fileFound) break;
      
      try {
        const fileUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
        
        const fileResponse = await fetch(fileUrl, {
          headers: getGitHubHeaders()
        });
        
        if (fileResponse.ok) {
          const fileData = await fileResponse.json() as GitHubFileResponse;
          
          // Delete the file
          const deleteResponse = await fetch(fileUrl, {
            method: "DELETE",
            headers: {
              ...getGitHubHeaders(),
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              message: `Delete ${filename} from ${category}`,
              sha: fileData.sha,
              branch: GITHUB_BRANCH
            })
          });
          
          if (deleteResponse.ok) {
            fileFound = true;
          } else {
            console.error(`Failed to delete file: ${deleteResponse.status}`);
          }
        }
      } catch (error) {
        console.error(`Error checking/deleting ${path}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: fileFound 
        ? "Image successfully deleted" 
        : "Image reference removed from gallery (file not found for deletion)"
    });
  } catch (error) {
    console.error("API Delete error:", error);
    return errorResponse(`Error deleting image: ${error instanceof Error ? error.message : String(error)}`, 500);
  }
}