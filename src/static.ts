// src/static.ts
import { ExecutionContext, R2Bucket } from "@cloudflare/workers-types";

interface Env {
  PORTFOLIO_BUCKET: R2Bucket;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const key = url.pathname.replace(/^\/static\//, "");

    // Handle cache control headers
    const cacheControl = request.headers.get("Cache-Control");

    // Try to get the object from R2
    const object = await env.PORTFOLIO_BUCKET.get(key);

    if (!object) {
      return new Response("Not Found", { status: 404 });
    }

    // Prepare response with appropriate headers
    const headers = new Headers();

    // Set content type and etag
    if (object.httpMetadata?.contentType) {
      headers.set("Content-Type", object.httpMetadata.contentType);
    }
    headers.set("etag", object.httpEtag);

    // Set cache control headers for better performance
    if (!cacheControl) {
      headers.set("Cache-Control", "public, max-age=86400");
    }

    // Convert R2ObjectBody to a Response object directly to handle type compatibility
    const response = new Response(null);

    // Use the wait until to consume the R2 object stream
    ctx.waitUntil(
      (async () => {
        const reader = object.body.getReader();
        const { readable, writable } = new TransformStream();

        const writer = writable.getWriter();

        const pump = async () => {
          const { done, value } = await reader.read();
          if (done) {
            await writer.close();
            return;
          }
          await writer.write(value);
          return pump();
        };

        pump().catch(console.error);

        // Assign the readable stream to the response
        Object.assign(response, { body: readable });
      })()
    );

    // Clone the response and add the headers
    return new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText,
    });
  },
};
