// src/static.ts

// import { ExecutionContext } from "@cloudflare/workers-types";

// We'll use a minimal type definition that avoids compatibility issues
interface R2Bucket {
  get(key: string): Promise<R2Object | null>;
}

interface R2Object {
  httpEtag: string;
  size: number;
  httpMetadata?: {
    contentType?: string;
  };
  body: ReadableStream;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface Env {
  PORTFOLIO_BUCKET: R2Bucket;
}

// Create a named constant to avoid the anonymous default export warning
const staticWorker = {
  async fetch(
    request: Request,
    env: Env
    // ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const key = url.pathname.replace(/^\/static\//, "");

    try {
      // Get the object from R2
      const object = await env.PORTFOLIO_BUCKET.get(key);

      if (!object) {
        return new Response("Not Found", { status: 404 });
      }

      // Create headers for the response
      const headers = new Headers();

      // Set content type if available
      if (object.httpMetadata?.contentType) {
        headers.set("Content-Type", object.httpMetadata.contentType);
      } else {
        // Set a default content type based on file extension
        const extension = key.split(".").pop()?.toLowerCase();
        if (extension) {
          const contentTypes: Record<string, string> = {
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            png: "image/png",
            gif: "image/gif",
            webp: "image/webp",
            svg: "image/svg+xml",
            css: "text/css",
            js: "application/javascript",
            json: "application/json",
            html: "text/html",
            txt: "text/plain",
          };

          if (contentTypes[extension]) {
            headers.set("Content-Type", contentTypes[extension]);
          }
        }
      }

      // Set etag for caching
      headers.set("ETag", object.httpEtag);

      // Set cache control
      headers.set("Cache-Control", "public, max-age=86400");

      // Access-Control-Allow-Origin for CORS requests
      headers.set("Access-Control-Allow-Origin", "*");

      // Get the data as ArrayBuffer (more compatible than ReadableStream)
      const data = await object.arrayBuffer();

      // Return the response with the data
      return new Response(data, {
        headers,
      });
    } catch (error) {
      console.error("Error serving static content:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};

// Export the named constant
export default staticWorker;
