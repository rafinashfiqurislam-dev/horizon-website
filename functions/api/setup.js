import { dbFirst, dbRun } from "../_lib/db.js";
import {
  hashPassword,
  json,
  readJson,
  sameOrigin,
  textValue
} from "../_lib/security.js";

export async function onRequestPost({ request, env }) {
  try {
    if (!sameOrigin(request)) {
      return json({ error: "Invalid request origin." }, 403);
    }

    if (!env.SETUP_TOKEN || env.SETUP_TOKEN.length < 32) {
      return json({ error: "Setup is not configured." }, 503);
    }

    const body = await readJson(request);

    if (
      typeof body.token !== "string" ||
      body.token !== env.SETUP_TOKEN
    ) {
      return json({ error: "Invalid setup token." }, 403);
    }

    const username = textValue(body.username, 50);
    const password = body.password;

    if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(username)) {
      return json({ error: "Invalid username." }, 400);
    }

    if (
      typeof password !== "string" ||
      password.length < 12 ||
      password.length > 128
    ) {
      return json({
        error: "Password must be 12 to 128 characters."
      }, 400);
    }

    const existing = await dbFirst(
      env,
      "SELECT id FROM admins LIMIT 1"
    );

    if (existing) {
      return json({ error: "Admin setup is already complete." }, 409);
    }

    const passwordHash = await hashPassword(password);

    await dbRun(
      env,
      "INSERT INTO admins(username, password_hash) VALUES (?, ?)",
      username,
      passwordHash
    );

    return json({
      ok: true,
      message: "Admin account created. Remove the SETUP_TOKEN secret after setup."
    }, 201);
  } catch {
    return json({ error: "Admin setup failed." }, 500);
  }
}
