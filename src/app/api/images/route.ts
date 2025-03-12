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
    });
    const response = await s3.send(command);
    const images = (response.Contents || [])
      .map((obj) => {
        if (!obj.Key) return null;
        const parts = obj.Key.split("/");
        return {
          url: `${process.env.R2_PUBLIC_URL}/${obj.Key}`, // Use public URL
          name: parts[parts.length - 1] || "unknown",
          category: parts[1] || "uncategorized",
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    console.log("Images from R2:", images);
    return NextResponse.json(images);
  } catch (error) {
    console.error("Error listing R2 objects:", error);
    return NextResponse.json(
      { error: "Failed to fetch images", details: error },
      { status: 500 }
    );
  }
}
