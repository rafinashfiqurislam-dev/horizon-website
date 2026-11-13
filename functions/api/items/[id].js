
import { dbFirst, dbRun } from "../../_lib/db.js";

import {
  json,
  readJson,
  validId,
  validImageUrl,
  validButtonUrl,
  textValue
} from "../../_lib/security.js";

import { adminRequest } from "../../_lib/auth.js";

function itemValues(body = {}) {
  return {
    type: textValue(body.type, 100),
    name: textValue(body.name, 200),
    short_perception: textValue(body.short_perception, 500),
    image: textValue(body.image, 1000),
    description: textValue(body.description, 10000),
    button_text: textValue(body.button_text, 100),
    button_url: textValue(body.button_url, 2000),
    status: ["draft", "published", "coming_soon"].includes(body.status)
      ? body.status
      : "draft",
    publish_at: textValue(body.publish_at, 100)
  };
}

export async function onRequestGet({ params, env }) {
  try {
    if (!validId(params.id)) {
      return json({ error: "Invalid item ID." }, 400);
    }

    const item = await dbFirst(
      env,
      "SELECT * FROM items WHERE id = ? AND status IN ('published', 'coming_soon')",
      Number(params.id)
    );

    if (!item) {
      return json({ error: "Item not found." }, 404);
    }

    return json(item);
  } catch {
    return json({ error: "Unable to load item." }, 500);
  }
}

export async function onRequestPut({ request, params, env }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    if (!validId(params.id)) {
      return json({ error: "Invalid item ID." }, 400);
    }

    const body = await readJson(request);
    const x = itemValues(body);

    if (!x.name || !x.type) {
      return json({
        error: "Name and content type are required."
      }, 400);
    }

    if (!validImageUrl(x.image) || !validButtonUrl(x.button_url)) {
      return json({ error: "Invalid image or button URL." }, 400);
    }

    const existing = await dbFirst(
      env,
      "SELECT id FROM items WHERE id = ?",
      Number(params.id)
    );

    if (!existing) {
      return json({ error: "Item not found." }, 404);
    }

    await dbRun(
      env,
      `UPDATE items SET
        type = ?,
        name = ?,
        short_perception = ?,
        image = ?,
        description = ?,
        button_text = ?,
        button_url = ?,
        status = ?,
        publish_at = ?
      WHERE id = ?`,
      x.type,
      x.name,
      x.short_perception,
      x.image,
      x.description,
      x.button_text,
      x.button_url,
      x.status,
      x.publish_at,
      Number(params.id)
    );

    return json({ ok: true });
  } catch (error) {
    if (error.message === "Request body is too large.") {
      return json({ error: error.message }, 413);
    }

    return json({ error: "Unable to update item." }, 500);
  }
}

export async function onRequestDelete({ request, params, env }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    if (!validId(params.id)) {
      return json({ error: "Invalid item ID." }, 400);
    }

    const result = await dbRun(
      env,
      "DELETE FROM items WHERE id = ?",
      Number(params.id)
    );

    if (!result.meta?.changes) {
      return json({ error: "Item not found." }, 404);
    }

    return json({ ok: true });
  } catch {
    return json({ error: "Unable to delete item." }, 500);
  }
}
