import { dbFirst, dbRun, getInsertId } from "../../../_lib/db.js";
import { json, readJson, textValue } from "../../../_lib/security.js";
import { adminRequest } from "../../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    const body = await readJson(request);
    const sectionId = Number(body.section_id);
    const name = textValue(body.name, 100);
    const description = textValue(body.description || "", 1000);

    if (!Number.isSafeInteger(sectionId) || sectionId < 1 || !name) {
      return json({ error: "Valid section and item name are required." }, 400);
    }

    const section = await dbFirst(
      env,
      "SELECT id FROM footer_sections WHERE id = ?",
      sectionId
    );

    if (!section) {
      return json({ error: "Footer section not found." }, 404);
    }

    const result = await dbRun(
      env,
      "INSERT INTO footer_items (section_id, name, description) VALUES (?, ?, ?)",
      sectionId,
      name,
      description
    );

    return json({ ok: true, id: getInsertId(result) }, 201);
  } catch {
    return json({ error: "Unable to create footer item." }, 500);
  }
}
