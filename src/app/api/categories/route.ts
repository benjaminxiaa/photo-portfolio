export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
});

export async function GET() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: "portfolio/",
      Delimiter: "/",
    });
    const response = await s3.send(command);
    const categories = (response.CommonPrefixes || [])
      .map((prefix) => {
        if (!prefix.Prefix) return null;
        return prefix.Prefix.split("/")[1];
      })
      .filter((cat): cat is string => cat !== null);
    console.log("Categories from R2:", categories);
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error listing R2 categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories", details: error },
      { status: 500 }
    );
  }
}
