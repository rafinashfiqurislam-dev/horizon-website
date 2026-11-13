import { dbRun } from "../../../_lib/db.js";
import {
  json,
  readJson,
  textValue,
  validId
} from "../../../_lib/security.js";
import { adminRequest } from "../../../_lib/auth.js";

export async function onRequestPut({ request, params, env }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    if (!validId(params.id)) {
      return json({ error: "Invalid section ID." }, 400);
    }

    const body = await readJson(request);
    const title = textValue(body.title, 100);

    if (!title) {
      return json({ error: "Section title is required." }, 400);
    }

    const sortOrder = Number.isInteger(body.sort_order)
      ? body.sort_order
      : 0;
    const isActive = body.is_active === false ? 0 : 1;

    const result = await dbRun(
      env,
      "UPDATE footer_sections SET title = ?, sort_order = ?, is_active = ? WHERE id = ?",
      title,
      sortOrder,
      isActive,
      Number(params.id)
    );

    if (!result.meta?.changes) {
      return json({ error: "Section not found." }, 404);
    }

    return json({ ok: true });
  } catch (error) {
    if (error.message === "Request body is too large.") {
      return json({ error: error.message }, 413);
    }

    return json({ error: "Unable to update footer section." }, 500);
  }
}

export async function onRequestDelete({ request, params, env }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    if (!validId(params.id)) {
      return json({ error: "Invalid section ID." }, 400);
    }

    const result = await dbRun(
      env,
      "DELETE FROM footer_sections WHERE id = ?",
      Number(params.id)
    );

    if (!result.meta?.changes) {
      return json({ error: "Section not found." }, 404);
    }

    return json({ ok: true });
  } catch {
    return json({ error: "Unable to delete footer section." }, 500);
  }
}
