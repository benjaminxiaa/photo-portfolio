// src/app/api/webhook/trigger-deploy/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/**
 * This endpoint triggers a Cloudflare Pages deployment using a deploy hook.
 *
 * You'll need to create a deploy hook in your Cloudflare Pages project settings:
 * 1. Go to your Cloudflare Pages project
 * 2. Click on Settings
 * 3. Scroll down to "Build & Deployments"
 * 4. Look for "Deploy Hooks"
 * 5. Create a new hook, give it a name (like "Manual Trigger")
 * 6. Save the URL Cloudflare gives you and add it to your environment variables as CLOUDFLARE_DEPLOY_HOOK
 */
export async function POST() {
  try {
    // Make sure the deploy hook is configured
    if (!process.env.CLOUDFLARE_DEPLOY_HOOK) {
      return NextResponse.json(
        {
          success: false,
          message: "Deploy hook is not configured in environment variables",
        },
        { status: 500 }
      );
    }

    // Trigger the Cloudflare Pages deployment using the deploy hook
    const response = await fetch(process.env.CLOUDFLARE_DEPLOY_HOOK, {
      method: "POST",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Failed to trigger deployment: ${response.status} ${response.statusText} - ${text}`
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message:
        "Deployment triggered successfully. Your changes will be live in a few minutes.",
    });
  } catch (error) {
    console.error("Error triggering deployment:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unknown error occurred while triggering deployment",
      },
      { status: 500 }
    );
  }
}
