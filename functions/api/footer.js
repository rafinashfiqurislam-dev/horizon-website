import { dbAll } from "../_lib/db.js";
import { json } from "../_lib/security.js";

export async function onRequestGet({ env }) {
  try {
    const sections = await dbAll(
      env,
      `SELECT id, title, sort_order
       FROM footer_sections
       WHERE is_active = 1
       ORDER BY sort_order ASC, id ASC`
    );

    const items = await dbAll(
      env,
      `SELECT id, section_id, label, url, sort_order
       FROM footer_items
       WHERE is_active = 1
       ORDER BY sort_order ASC, id ASC`
    );

    return json({ sections, items });
  } catch {
    return json({ error: "Unable to load footer." }, 500);
  }
}
