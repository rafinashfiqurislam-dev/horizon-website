
import { dbAll, dbRun } from "../../_lib/db.js";
import {
  json,
  readJson,
  textValue,
  validEmail
} from "../../_lib/security.js";
import { adminRequest } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    const url = new URL(request.url);
    const mode = url.searchParams.get("mode");

    let sql = "SELECT * FROM messages ORDER BY id DESC";

    if (mode === "unread") {
      sql = "SELECT * FROM messages WHERE is_read = 0 ORDER BY id DESC";
    } else if (mode === "read") {
      sql = "SELECT * FROM messages WHERE is_read = 1 ORDER BY id DESC";
    }

    return json(await dbAll(env, sql));
  } catch {
    return json({ error: "Unable to load messages." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const origin = new URL(request.url).origin;

    if (request.headers.get("Origin") !== origin) {
      return json({ error: "Invalid request origin." }, 403);
    }

    const body = await readJson(request);
    const email = textValue(body.email, 254).toLowerCase();
    const message = textValue(body.message, 5000);

    if (!validEmail(email) || !message.trim()) {
      return json({ error: "Enter a valid email and message." }, 400);
    }

    await dbRun(
      env,
      "INSERT INTO messages (email, message) VALUES (?, ?)",
      email,
      message
    );

    return json({ ok: true, message: "Message received." }, 201);
  } catch (error) {
    if (error.message === "Request body is too large.") {
      return json({ error: error.message }, 413);
    }

    return json({ error: "Unable to send message." }, 500);
  }
}
