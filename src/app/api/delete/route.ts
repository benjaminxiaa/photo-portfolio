export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
});

export async function DELETE(request: NextRequest) {
  console.log("DELETE /api/delete called");
  try {
    const { key } = await request.json();
    console.log("Received key:", key);
    if (!key) {
      console.log("No key provided");
      return NextResponse.json({ error: "No key provided" }, { status: 400 });
    }

    const params = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    };
    console.log("R2 Delete params:", params);
    console.log(
      "Environment vars - Bucket:",
      process.env.R2_BUCKET_NAME,
      "Account ID:",
      process.env.R2_ACCOUNT_ID
    );

    const command = new DeleteObjectCommand(params);
    const result = await s3.send(command);
    console.log("R2 delete result:", JSON.stringify(result, null, 2)); // Detailed result

    // R2 returns 204 on success, but let's verify
    if (result.$metadata.httpStatusCode !== 204) {
      console.log(
        "Unexpected status code from R2:",
        result.$metadata.httpStatusCode
      );
      return NextResponse.json(
        { error: "Delete operation failed on R2" },
        { status: 500 }
      );
    }

    console.log("Delete successful for key:", key);
    return NextResponse.json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete image", details: error },
      { status: 500 }
    );
  }
}
