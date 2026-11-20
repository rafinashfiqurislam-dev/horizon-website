import {
  json,
  readJson,
  textValue,
  validImageUrl
} from "../_lib/security.js";

import { adminRequest } from "../_lib/auth.js";

const allowedKeys = [
  "company_intro",
  "tagline",
  "mission_heading",
  "mission_short",
  "mission_description",
  "vision_heading",
  "vision_short",
  "vision_description",
  "support_line",

  // Background images
  "hero_image",
  "purpose_image",
  "support_image"
];

const imageKeys = [
  "hero_image",
  "purpose_image",
  "support_image"
];

export async function onRequestPut({ request, env }) {
  try {
    const { response } = await adminRequest(request, env);

    if (response) {
      return response;
    }

    const body = await readJson(request);
    const statements = [];

    for (const key of allowedKeys) {
      if (body[key] === undefined) {
        continue;
      }

      const value = textValue(body[key], 10000);

      if (
        imageKeys.includes(key) &&
        value !== "" &&
        !validImageUrl(value)
      ) {
        return json(
          { error: `Invalid image URL for ${key}.` },
          400
        );
      }

      statements.push(
        env.DB.prepare(
          `INSERT INTO content (key, value)
           VALUES (?, ?)
           ON CONFLICT(key)
           DO UPDATE SET value = excluded.value`
        ).bind(key, value)
      );
    }

    if (statements.length > 0) {
      await env.DB.batch(statements);
    }

    return json({
      ok: true,
      message: "Website content updated successfully."
    });

  } catch (error) {
    if (error.message === "Request body is too large.") {
      return json(
        { error: error.message },
        413
      );
    }

    return json(
      { error: "Unable to update website content." },
      500
    );
  }
  }
