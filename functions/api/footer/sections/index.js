import { dbRun, getInsertId } from "../../../_lib/db.js";
import {
  json,
  readJson,
  textValue
} from "../../../_lib/security.js";
import { adminRequest } from "../../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    const body = await readJson(request);
    const title = textValue(body.title, 100);
    const sortOrder = Number.isInteger(body.sort_order)
      ? body.sort_order
      : 0;

    if (!title) {
      return json({ error: "Section title is required." }, 400);
    }

    const result = await dbRun(
      env,
      "INSERT INTO footer_sections (title, sort_order, is_active) VALUES (?, ?, 1)",
      title,
      sortOrder
    );

    return json(
      { ok: true, id: getInsertId(result) },
      201
    );
  } catch (error) {
    if (error.message === "Request body is too large.") {
      return json({ error: error.message }, 413);
    }

    return json({ error: "Unable to create footer section." }, 500);
  }
}
