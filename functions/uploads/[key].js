import { json } from "../_lib/security.js";

export async function onRequestGet({ params, env }) {
  try {
    if (!env.UPLOADS) {
      return json({ error: "Storage is not configured." }, 503);
    }

    const key = params.key;

    if (
      typeof key !== "string" ||
      !/^[0-9a-f-]{36}\.(jpg|png|gif|webp)$/i.test(key)
    ) {
      return json({ error: "Invalid image key." }, 400);
    }

    const object = await env.UPLOADS.get(key);

    if (!object) {
      return json({ error: "Image not found." }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(object.body, {
      status: 200,
      headers
    });
  } catch {
    return json({ error: "Unable to load image." }, 500);
  }
                        }
