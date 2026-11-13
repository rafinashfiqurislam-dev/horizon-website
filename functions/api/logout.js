
import {
  json,
  sameOrigin,
  clearSessionCookie
} from "../_lib/security.js";

export async function onRequestPost({ request }) {
  if (!sameOrigin(request)) {
    return json({ error: "Invalid request origin." }, 403);
  }

  return json(
    { ok: true, message: "Logged out successfully." },
    200,
    {
      "Set-Cookie": clearSessionCookie()
    }
  );
}
