
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

    if (!env.ADMIN_SETUP_KEY || env.ADMIN_SETUP_KEY.length < 32) {
      return json({ error: "Admin setup is not configured." }, 503);
    }

    const body = await readJson(request);

    if (body.setupKey !== env.ADMIN_SETUP_KEY) {
      return json({ error: "Incorrect setup key." }, 403);
    }

    const username = textValue(body.username, 50);
    const password = body.password;

    if (!/^[A-Za-z0-9_.-]{2,50}$/.test(username)) {
      return json({ error: "Username must be 2–50 characters." }, 400);
    }

    if (typeof password !== "string" || password.length < 4 || password.length > 128) {
      return json({ error: "Password must be 4–128 characters." }, 400);
    }

    const existing = await dbFirst(
      env,
      "SELECT COUNT(*) AS count FROM admins"
    );

    if (Number(existing?.count || 0) > 0) {
      return json({ error: "Admin already exists." }, 409);
    }

    const passwordHash = await hashPassword(password);

    await dbRun(
      env,
      "INSERT INTO admins (username, password_hash) VALUES (?, ?)",
      username,
      passwordHash
    );

    return json({ ok: true, message: "Admin account created." }, 201);
  } catch {
    return json({ error: "Admin setup failed." }, 500);
  }
  }
