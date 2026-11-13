
import { getSession, json } from "../_lib/security.js";

export async function onRequestGet({ request, env }) {
  try {
    const admin = await getSession(
      request,
      env.SESSION_SECRET
    );

    if (!admin) {
      return json({
        admin: null,
        authenticated: false
      });
    }

    return json({
      admin: {
        id: admin.id,
        username: admin.username
      },
      authenticated: true
    });
  } catch {
    return json({ error: "Unable to check login status." }, 500);
  }
}
