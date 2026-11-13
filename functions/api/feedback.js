
import { dbAll, dbRun } from "../_lib/db.js";
import {
  json,
  readJson,
  textValue,
  validEmail
} from "../_lib/security.js";
import { adminRequest } from "../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    const rows = await dbAll(
      env,
      "SELECT id, email, message, created_at FROM feedback ORDER BY id DESC LIMIT 500"
    );

    return json(rows);
  } catch {
    return json({ error: "Unable to load feedback." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (request.headers.get("Origin") !== new URL(request.url).origin) {
      return json({ error: "Invalid request origin." }, 403);
    }

    const body = await readJson(request);
    const email = textValue(body.email, 254);
    const message = textValue(body.message, 2000);

    if (!message || (email && !validEmail(email))) {
      return json({
        error: "Please provide a valid email and feedback message."
      }, 400);
    }

    await dbRun(
      env,
      "INSERT INTO feedback (email, message) VALUES (?, ?)",
      email,
      message
    );

    return json({ ok: true }, 201);
  } catch (error) {
    if (error.message === "Request body is too large.") {
      return json({ error: error.message }, 413);
    }

    return json({ error: "Unable to submit feedback." }, 500);
  }
}
