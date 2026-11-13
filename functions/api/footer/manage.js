import { dbAll } from "../../_lib/db.js";
import { json } from "../../_lib/security.js";
import { adminRequest } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    const sections = await dbAll(
      env,
      "SELECT id, title FROM footer_sections ORDER BY id ASC"
    );

    const items = await dbAll(
      env,
      "SELECT id, section_id, name, description FROM footer_items ORDER BY id ASC"
    );

    return json({ sections, items });
  } catch {
    return json({ error: "Unable to load footer management data." }, 500);
  }
}
