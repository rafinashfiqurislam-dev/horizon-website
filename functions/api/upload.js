
import { json } from "../_lib/security.js";
import { adminRequest } from "../_lib/auth.js";

const MAX_SIZE = 5 * 1024 * 1024;

function detectImage(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (String.fromCharCode(...bytes.slice(0, 6)).startsWith("GIF8")) return "gif";
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return "webp";
  return null;
}

export async function onRequestPost({ request, env }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    if (!env.IMAGEKIT_PRIVATE_KEY || !env.IMAGEKIT_URL_ENDPOINT) {
      return json({ error: "ImageKit is not configured." }, 503);
    }

    const form = await request.formData();
    const file = form.get("image");

    if (!file || typeof file.arrayBuffer !== "function") {
      return json({ error: "Image file is required." }, 400);
    }

    if (file.size <= 0 || file.size > MAX_SIZE) {
      return json({ error: "Image must be smaller than 5 MB." }, 413);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = detectImage(bytes);

    if (!extension) {
      return json({ error: "Only valid JPG, PNG, GIF or WEBP images are allowed." }, 415);
    }

    const contentTypes = {
      jpg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp"
    };

    const uploadForm = new FormData();
    uploadForm.append(
      "file",
      new Blob([bytes], { type: contentTypes[extension] }),
      `image.${extension}`
    );
    uploadForm.append("fileName", `${crypto.randomUUID()}.${extension}`);
    uploadForm.append("useUniqueFileName", "true");

    const auth = btoa(`${env.IMAGEKIT_PRIVATE_KEY}:`);

    const result = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`
      },
      body: uploadForm
    });

    if (!result.ok) {
      return json({ error: "ImageKit upload failed." }, 502);
    }

    const uploaded = await result.json();

    return json({
      ok: true,
      url: uploaded.url
    }, 201);
  } catch {
    return json({ error: "Unable to upload image." }, 500);
  }
}
