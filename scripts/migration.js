// scripts/migrate-to-r2.js
import fs from "fs/promises";
import path from "path";
import mime from "mime-types";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Configure the S3 client (Cloudflare R2 uses S3-compatible API)
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.PORTFOLIO_BUCKET || "photo-portfolio-images";
const staticDir = path.join(process.cwd(), "public", "static", "portfolio");
const categories = ["nature", "wildlife", "architecture", "travel"];

// Function to upload a file to R2
async function uploadFileToR2(filePath, category, fileName) {
  try {
    const fileContent = await fs.readFile(filePath);
    const contentType = mime.lookup(filePath) || "application/octet-stream";

    const r2Path = `portfolio/${category}/${fileName}`;
    console.log(`Uploading ${fileName} to R2 (${r2Path})...`);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: r2Path,
      Body: fileContent,
      ContentType: contentType,
    });

    const response = await s3Client.send(command);
    console.log(
      `Successfully uploaded ${fileName} to R2 (ETag: ${response.ETag})`
    );

    return {
      success: true,
      src: `/static/${r2Path}`,
      fileName,
    };
  } catch (error) {
    console.error(`Error uploading ${fileName} to R2:`, error);
    return {
      success: false,
      fileName,
      error: error.message,
    };
  }
}

// Function to process all files in a category
async function processCategory(category) {
  try {
    const categoryDir = path.join(staticDir, category);

    // Check if directory exists
    try {
      await fs.access(categoryDir);
    } catch (e) {
      console.warn(
        `Category directory ${category} does not exist or is not accessible. Skipping.`
      );
      return {
        category,
        processed: 0,
        successes: 0,
        failures: 0,
        files: [],
      };
    }

    // Get all files in the category directory
    const files = await fs.readdir(categoryDir);
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);
    });

    console.log(`Found ${imageFiles.length} images in ${category} category`);

    // Process each file
    const results = [];
    for (const file of imageFiles) {
      const filePath = path.join(categoryDir, file);
      const result = await uploadFileToR2(filePath, category, file);
      results.push(result);
    }

    // Summarize results
    const successes = results.filter((r) => r.success).length;
    const failures = results.filter((r) => !r.success).length;

    return {
      category,
      processed: imageFiles.length,
      successes,
      failures,
      files: results,
    };
  } catch (error) {
    console.error(`Error processing category ${category}:`, error);
    return {
      category,
      processed: 0,
      successes: 0,
      failures: 1,
      error: error.message,
    };
  }
}

// Main function to process all categories
async function migrateAllImages() {
  console.log("Starting migration of images to Cloudflare R2...");
  console.log(`Using bucket: ${bucketName}`);

  const results = [];

  for (const category of categories) {
    console.log(`\nProcessing ${category} category...`);
    const result = await processCategory(category);
    results.push(result);
    console.log(
      `Completed ${category}: ${result.successes} succeeded, ${result.failures} failed\n`
    );
  }

  // Print summary
  console.log("\n--- MIGRATION SUMMARY ---");
  let totalProcessed = 0;
  let totalSuccesses = 0;
  let totalFailures = 0;

  results.forEach((result) => {
    console.log(
      `${result.category}: ${result.successes}/${result.processed} succeeded`
    );
    totalProcessed += result.processed;
    totalSuccesses += result.successes;
    totalFailures += result.failures;
  });

  console.log("\nOverall:");
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Total successes: ${totalSuccesses}`);
  console.log(`Total failures: ${totalFailures}`);
  console.log(
    `Success rate: ${
      totalProcessed > 0
        ? ((totalSuccesses / totalProcessed) * 100).toFixed(2)
        : 0
    }%`
  );

  // Write results to a log file
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logContent = JSON.stringify(results, null, 2);
  const logPath = path.join(process.cwd(), `migration-log-${timestamp}.json`);

  await fs.writeFile(logPath, logContent);
  console.log(`\nDetailed log written to: ${logPath}`);
}

// Check for required environment variables
const requiredEnvVars = [
  "CLOUDFLARE_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  console.error("Missing required environment variables:");
  missingEnvVars.forEach((varName) => console.error(`- ${varName}`));
  console.error("\nPlease set these variables before running the script.");
  console.error(
    "You can use a .env file or set them directly in your terminal."
  );
  process.exit(1);
}

// Run the migration
migrateAllImages().catch((error) => {
  console.error("Migration failed with error:", error);
  process.exit(1);
});
