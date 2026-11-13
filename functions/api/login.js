
import { dbFirst } from "../_lib/db.js";
import {
  json,
  readJson,
  sameOrigin,
  textValue,
  verifyPassword,
  createSession,
  sessionCookie
} from "../_lib/security.js";

export async function onRequestPost({ request, env }) {
  try {
    if (!sameOrigin(request)) {
      return json({ error: "Invalid request origin." }, 403);
    }

    if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
      return json({ error: "Authentication is not configured." }, 503);
    }

    const body = await readJson(request);
    const username = textValue(body.username, 50);
    const password = body.password;

    if (
      !username ||
      typeof password !== "string" ||
      password.length < 1 ||
      password.length > 128
    ) {
      return json({ error: "Invalid username or password." }, 400);
    }

    const admin = await dbFirst(
      env,
      "SELECT id, username, password_hash FROM admins WHERE username = ? LIMIT 1",
      username
    );

    if (!admin || !(await verifyPassword(password, admin.password_hash))) {
      return json({ error: "Invalid username or password." }, 401);
    }

    const token = await createSession(
      { id: admin.id, username: admin.username },
      env.SESSION_SECRET
    );

    return json(
      {
        ok: true,
        username: admin.username
      },
      200,
      {
        "Set-Cookie": sessionCookie(token)
      }
    );
  } catch (error) {
    if (error.message === "Request body is too large.") {
      return json({ error: error.message }, 413);
    }

    return json({ error: "Login failed. Please try again." }, 500);
  }
}
