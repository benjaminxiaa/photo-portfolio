// src/app/api/images/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || "benjaminxiaa";
const GITHUB_REPO = process.env.GITHUB_REPO || "photo-portfolio";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

// Error details type
interface ErrorDetails {
  [key: string]: string | boolean | string[] | undefined;
}

// Validate category
function isValidCategory(category: string): boolean {
  const validCategories = ['nature', 'wildlife', 'architecture', 'travel'];
  return validCategories.includes(category);
}

// Helper for error responses with more detailed logging
function errorResponse(
  message: string, 
  details?: ErrorDetails, 
  status = 400
): NextResponse {
  console.error(`Error Response: ${message}`, details);
  return NextResponse.json({ 
    success: false, 
    message,
    details: details ? JSON.stringify(details) : undefined 
  }, { status });
}

// GitHub API response types
interface GitHubFileResponse {
  name: string;
  path: string;
  sha: string;
  content?: string;
  encoding?: string;
  type: string;
  download_url: string | null;
}

// Get the contents of the page.tsx file
async function getPageFileContent(category: string): Promise<{ 
  content: string; 
  sha: string;
}> {
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
    const errorText = await pageResponse.text();
    throw new Error(`Failed to get page file: ${pageResponse.status} ${errorText}`);
  }
  
  const pageData = await pageResponse.json() as GitHubFileResponse;
  return {
    content: pageData.content || '',
    sha: pageData.sha
  };
}

// Parse images from page.tsx content
function extractImagesFromPageContent(content: string): Array<{
  src: string;
  width: number;
  height: number;
}> {
  try {
    // Decode base64 content
    const decodedContent = Buffer.from(content, 'base64').toString('utf-8');
    
    // Extract the images array using a regex
    const imagesMatch = decodedContent.match(/const images = \[([\s\S]*?)];/);
    
    if (!imagesMatch) {
      console.error("Could not find images array in page content");
      return [];
    }
    
    // Use eval-like parsing (safely processed)
    const imagesArrayStr = `[${imagesMatch[1]}]`;
    const parsedImages = JSON.parse(imagesArrayStr.replace(/\n/g, '').replace(/\s+/g, ' '));
    
    return parsedImages;
  } catch (error) {
    console.error("Error parsing images:", error);
    return [];
  }
}

// Modify page.tsx file to update image list
async function updatePageFile(
  category: string, 
  action: 'add' | 'remove', 
  imagePath: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get the current page.tsx file
    const { content: fileContent, sha: currentSha } = await getPageFileContent(category);
    
    let updatedContent;
    if (action === 'add') {
      // Prepare new image entry with default dimensions
      const newImageEntry = `
    {
      src: "${imagePath}",
      width: 1000,
      height: 800
    },`;
      
      // Insert the new image at the beginning of the array
      updatedContent = fileContent.replace(
        'const images = [',
        'const images = [' + newImageEntry
      );
    } else {
      // Remove image
      // Escape special characters in the source path for regex
      const escapedSrc = imagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Create patterns to match the image object in different scenarios
      const patternWithComma = new RegExp(`\\s*{[\\s\\S]*?src:\\s*["']${escapedSrc}["'][\\s\\S]*?}\\s*,`, 'g');
      const patternWithoutComma = new RegExp(`\\s*{[\\s\\S]*?src:\\s*["']${escapedSrc}["'][\\s\\S]*?}\\s*(?=\\])`, 'g');
      
      if (patternWithComma.test(fileContent)) {
        patternWithComma.lastIndex = 0;
        updatedContent = fileContent.replace(patternWithComma, '');
      } else if (patternWithoutComma.test(fileContent)) {
        patternWithoutComma.lastIndex = 0;
        updatedContent = fileContent.replace(patternWithoutComma, '');
      } else {
        console.log("Image reference not found in page file");
        return { success: false, message: "Image not found in gallery" };
      }
      
      // Clean up formatting
      updatedContent = updatedContent
        .replace(/,\s*,/g, ',')  // Fix double commas
        .replace(/\[\s*,/g, '[') // Fix comma after opening bracket
        .replace(/,\s*\]/g, ']'); // Fix comma before closing bracket
    }
    
    // Commit the updated page file
    const pagePath = `src/app/photo/${category}/page.tsx`;
    const updateUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${pagePath}`;
    
    const updateResponse = await fetch(updateUrl, {
      method: "PUT",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `token ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `${action === 'add' ? 'Add' : 'Remove'} image from ${category} gallery`,
        content: Buffer.from(updatedContent).toString('base64'),
        sha: currentSha,
        branch: GITHUB_BRANCH
      })
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error(`Failed to update page file: ${updateResponse.status}`, errorText);
      return { 
        success: false, 
        message: `Failed to update page file: ${updateResponse.status} ${errorText}` 
      };
    }
    
    return { 
      success: true, 
      message: `Image ${action === 'add' ? 'added' : 'removed'} successfully` 
    };
  } catch (error) {
    console.error("Error updating page file:", error);
    return { 
      success: false, 
      message: `Error updating page file: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

// GET method to fetch images
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    
    if (!category) {
      return errorResponse("Category parameter is required", { 
        categoryProvided: false 
      });
    }
    
    if (!isValidCategory(category)) {
      return errorResponse("Invalid category", { 
        providedCategory: category,
        validCategories: ['nature', 'wildlife', 'architecture', 'travel']
      });
    }
    
    // Get the page.tsx file for the category
    const { content } = await getPageFileContent(category);
    
    // Extract images from page content
    const images = extractImagesFromPageContent(content);
    
    return NextResponse.json({
      success: true,
      images
    });
  } catch (error) {
    console.error("API Error:", error);
    return errorResponse(`Error processing request: ${error instanceof Error ? error.message : String(error)}`, {
      errorType: error instanceof Error ? error.name : 'Unknown',
      errorStack: error instanceof Error ? error.stack : undefined
    }, 500);
  }
}

// DELETE method to remove an image
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { src, category } = body;
    
    if (!src) {
      return errorResponse("Image source is required", { 
        sourceProvided: false 
      });
    }
    
    if (!category) {
      return errorResponse("Category is required", { 
        categoryProvided: false 
      });
    }
    
    // Validate category
    if (!isValidCategory(category)) {
      return errorResponse("Invalid category", { 
        providedCategory: category,
        validCategories: ['nature', 'wildlife', 'architecture', 'travel']
      });
    }
    
    // Extract filename from src
    const filename = src.split('/').pop();
    
    if (!filename) {
      return errorResponse("Invalid image source path", { 
        providedSource: src 
      });
    }
    
    // Construct full file path
    const filePath = `public/static/portfolio/${category}/${filename}`;
    
    // First, get the current file's SHA
    const getFileUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`;
    
    const getResponse = await fetch(getFileUrl, {
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `token ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
    
    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      console.error(`Failed to get file: ${getResponse.status}`, errorText);
      return errorResponse(`Failed to get file: ${getResponse.status}`, {
        fileUrl: getFileUrl,
        errorText
      });
    }
    
    const fileData = await getResponse.json() as GitHubFileResponse;
    
    // Delete the file
    const deleteUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
    
    const deleteResponse = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `token ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Remove ${filename} from ${category}`,
        sha: fileData.sha,
        branch: GITHUB_BRANCH
      })
    });
    
    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error(`Failed to delete file: ${deleteResponse.status}`, errorText);
      return errorResponse(`GitHub API error: ${deleteResponse.status}`, {
        deleteUrl,
        errorText
      });
    }
    
    // Remove the image from the page.tsx file
    const updateResult = await updatePageFile(category, 'remove', src);
    
    if (!updateResult.success) {
      return errorResponse(updateResult.message, {
        updateAction: 'remove',
        category
      });
    }
    
    return NextResponse.json({
      success: true,
      message: "Image deleted from gallery successfully"
    });
  } catch (error) {
    console.error("API Delete error:", error);
    return errorResponse(`Error deleting image: ${error instanceof Error ? error.message : String(error)}`, {
      errorType: error instanceof Error ? error.name : 'Unknown',
      errorStack: error instanceof Error ? error.stack : undefined
    }, 500);
  }
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