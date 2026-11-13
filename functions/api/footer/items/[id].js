import { dbRun } from "../../../_lib/db.js";
import { json, readJson, textValue } from "../../../_lib/security.js";
import { adminRequest } from "../../../_lib/auth.js";

export async function onRequestPut({ request, env, params }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    const id = Number(params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      return json({ error: "Invalid footer item ID." }, 400);
    }

    const body = await readJson(request);
    const name = textValue(body.name, 100);
    const description = textValue(body.description || "", 1000);

    if (!name) {
      return json({ error: "Item name is required." }, 400);
    }

    const result = await dbRun(
      env,
      "UPDATE footer_items SET name = ?, description = ? WHERE id = ?",
      name,
      description,
      id
    );

    if (!result?.meta?.changes) {
      return json({ error: "Footer item not found." }, 404);
    }

    return json({ ok: true });
  } catch {
    return json({ error: "Unable to update footer item." }, 500);
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    const id = Number(params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      return json({ error: "Invalid footer item ID." }, 400);
    }

    const result = await dbRun(
      env,
      "DELETE FROM footer_items WHERE id = ?",
      id
    );

    if (!result?.meta?.changes) {
      return json({ error: "Footer item not found." }, 404);
    }

    return json({ ok: true });
  } catch {
    return json({ error: "Unable to delete footer item." }, 500);
  }
}
