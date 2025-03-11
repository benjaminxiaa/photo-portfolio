// src/app/api/webhook/trigger-deploy/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(_request: NextRequest) {
  try {
    // Get Cloudflare Pages webhook URL from environment variables
    const webhookUrl = process.env.CLOUDFLARE_DEPLOY_HOOK;

    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, message: "Deployment webhook URL not configured" },
        { status: 500 }
      );
    }

    // Trigger the webhook to start a new deployment
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          message: `Failed to trigger deployment: ${errorText}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      message: "Deployment triggered successfully",
      deployData: data,
    });
  } catch (error) {
    console.error("Error triggering deployment:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to trigger deployment",
      },
      { status: 500 }
    );
  }
}
