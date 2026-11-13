
import { dbAll } from "../_lib/db.js";
import { json } from "../_lib/security.js";

export async function onRequestGet({ env }) {
  try {
    const contentRows = await dbAll(
      env,
      "SELECT key, value FROM content"
    );

    const content = Object.fromEntries(
      contentRows.map(row => [row.key, row.value])
    );

    const items = await dbAll(
      env,
      "SELECT * FROM items WHERE status IN ('published', 'coming_soon') ORDER BY id DESC"
    );

    return json({ content, items });
  } catch {
    return json(
      { error: "Unable to load website content." },
      500
    );
  }
       }
