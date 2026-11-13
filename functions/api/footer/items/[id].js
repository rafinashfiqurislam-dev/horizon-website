import { dbRun } from "../../../_lib/db.js";
import {
  json,
  readJson,
  textValue,
  validId,
  validButtonUrl
} from "../../../_lib/security.js";
import { adminRequest } from "../../../_lib/auth.js";

export async function onRequestPut({ request, params, env }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    if (!validId(params.id)) {
      return json({ error: "Invalid footer item ID." }, 400);
    }

    const body = await readJson(request);
    const label = textValue(body.label, 100);
    const url = textValue(body.url, 500);
    const sectionId = Number(body.section_id);
    const sortOrder = Number.isInteger(body.sort_order)
      ? body.sort_order
      : 0;
    const isActive = body.is_active === false ? 0 : 1;

    if (!label || !validButtonUrl(url) || !validId(String(sectionId))) {
      return json({ error: "Invalid footer item details." }, 400);
    }

    const result = await dbRun(
      env,
      `UPDATE footer_items
       SET section_id = ?, label = ?, url = ?, sort_order = ?, is_active = ?
       WHERE id = ?`,
      sectionId,
      label,
      url,
      sortOrder,
      isActive,
      Number(params.id)
    );

    if (!result.meta?.changes) {
      return json({ error: "Footer item not found." }, 404);
    }

    return json({ ok: true });
  } catch (error) {
    if (error.message === "Request body is too large.") {
      return json({ error: error.message }, 413);
    }

    return json({ error: "Unable to update footer item." }, 500);
  }
}

export async function onRequestDelete({ request, params, env }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    if (!validId(params.id)) {
      return json({ error: "Invalid footer item ID." }, 400);
    }

    const result = await dbRun(
      env,
      "DELETE FROM footer_items WHERE id = ?",
      Number(params.id)
    );

    if (!result.meta?.changes) {
      return json({ error: "Footer item not found." }, 404);
    }

    return json({ ok: true });
  } catch {
    return json({ error: "Unable to delete footer item." }, 500);
  }
}
