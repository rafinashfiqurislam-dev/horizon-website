import { dbRun, getInsertId } from "../../../_lib/db.js";
import {
  json,
  readJson,
  textValue,
  validId,
  validButtonUrl
} from "../../../_lib/security.js";
import { adminRequest } from "../../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    const body = await readJson(request);
    const sectionId = Number(body.section_id);
    const label = textValue(body.label, 100);
    const url = textValue(body.url, 500);
    const sortOrder = Number.isInteger(body.sort_order)
      ? body.sort_order
      : 0;

    if (!validId(String(sectionId)) || !label || !validButtonUrl(url)) {
      return json({ error: "Invalid footer item details." }, 400);
    }

    const result = await dbRun(
      env,
      "INSERT INTO footer_items (section_id, label, url, sort_order, is_active) VALUES (?, ?, ?, ?, 1)",
      sectionId,
      label,
      url,
      sortOrder
    );

    return json({ ok: true, id: getInsertId(result) }, 201);
  } catch (error) {
    if (error.message === "Request body is too large.") {
      return json({ error: error.message }, 413);
    }

    return json({ error: "Unable to create footer item." }, 500);
  }
}
