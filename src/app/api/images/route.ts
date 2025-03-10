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
  [key: string]: string | boolean | string[] | number | undefined;
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
  }, { 
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// POST method to add an image
export async function POST(request: NextRequest) {
  try {
    console.log("Starting POST request");
    console.log("Request content type:", request.headers.get('content-type'));

    // Check if this is a multipart/form-data request
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      console.error("Incorrect content type", { contentType });
      return errorResponse("Incorrect content type. Must be multipart/form-data", {
        receivedContentType: contentType || 'undefined'
      });
    }

    // Attempt to parse form data
    let formData;
    try {
      formData = await request.formData();
      console.log("Form data parsed successfully");
    } catch (formError) {
      console.error("Form data parsing error:", formError);
      return errorResponse("Failed to parse form data", {
        errorMessage: formError instanceof Error ? formError.message : String(formError),
        errorType: formError instanceof Error ? formError.name : 'Unknown'
      });
    }

    // Log form data keys
    const formDataKeys = Array.from(formData.keys());
    console.log("Form Data Keys:", formDataKeys);
    
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string | null;
    
    console.log("File:", file ? { 
      name: file.name, 
      type: file.type, 
      size: file.size 
    } : null);
    console.log("Category:", category);
    
    if (!file) {
      return errorResponse("No file provided", { 
        filePresent: false,
        formDataKeys 
      });
    }
    
    if (!category) {
      return errorResponse("No category provided", { 
        categoryPresent: false,
        formDataKeys 
      });
    }
    
    // Validate category
    if (!isValidCategory(category)) {
      return errorResponse("Invalid category", { 
        providedCategory: category,
        validCategories: ['nature', 'wildlife', 'architecture', 'travel']
      });
    }
    
    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"];
    if (!validTypes.includes(file.type)) {
      return errorResponse("File must be an image (JPEG, PNG, WebP, GIF)", { 
        fileType: file.type,
        validTypes 
      });
    }
    
    // Read file as ArrayBuffer with error handling
    let buffer;
    try {
      buffer = await file.arrayBuffer();
      console.log("File buffer read successfully", { bufferSize: buffer.byteLength });
    } catch (bufferError) {
      console.error("Buffer reading error:", bufferError);
      return errorResponse("Failed to read file", {
        errorMessage: bufferError instanceof Error ? bufferError.message : String(bufferError)
      });
    }
    
    // Convert to base64
    const base64Content = Buffer.from(buffer).toString('base64');
    console.log("Base64 conversion completed", { base64Length: base64Content.length });
    
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
    
    let uploadResponse;
    try {
      uploadResponse = await fetch(uploadUrl, {
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
      
      console.log("GitHub upload response status:", uploadResponse.status);
    } catch (uploadError) {
      console.error("GitHub upload fetch error:", uploadError);
      return errorResponse("Failed to upload to GitHub", {
        errorMessage: uploadError instanceof Error ? uploadError.message : String(uploadError)
      });
    }
    
    // Check upload response
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error(`GitHub upload error: ${uploadResponse.status}`, errorText);
      return errorResponse(`GitHub API upload error: ${uploadResponse.status}`, { 
        status: uploadResponse.status, 
        errorText 
      });
    }
    
    // Attempt to parse upload response
    let uploadData;
    try {
      uploadData = await uploadResponse.json();
      console.log("Upload response parsed successfully");
    } catch (parseError) {
      console.error("Failed to parse upload response", parseError);
      
      // If parsing fails, still return a success response
      return NextResponse.json({
        success: true,
        message: "File uploaded successfully (response parsing failed)",
        filePath: `/static/portfolio/${category}/${uniqueFileName}`
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Extensive logging
    console.log("Upload successful", uploadData);
    
    // If we got this far, the image is uploaded
    const imageSrc = `/static/portfolio/${category}/${uniqueFileName}`;
    
    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      filePath: imageSrc
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    // Catch-all error handler with maximum logging
    console.error("Unexpected upload error:", error);
    return errorResponse(`Unexpected error during upload: ${error instanceof Error ? error.message : String(error)}`, {
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