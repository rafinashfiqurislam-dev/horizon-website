import { dbRun } from "../../../_lib/db.js";
import { json, readJson, textValue } from "../../../_lib/security.js";
import { adminRequest } from "../../../_lib/auth.js";

export async function onRequestPut({ request, env, params }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    const id = Number(params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      return json({ error: "Invalid section ID." }, 400);
    }

    const body = await readJson(request);
    const title = textValue(body.title, 100);

    if (!title) {
      return json({ error: "Section title is required." }, 400);
    }

    await dbRun(
      env,
      "UPDATE footer_sections SET title = ? WHERE id = ?",
      title,
      id
    );

    return json({ ok: true });
  } catch {
    return json({ error: "Unable to update footer section." }, 500);
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    const id = Number(params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      return json({ error: "Invalid section ID." }, 400);
    }

    await dbRun(
      env,
      "DELETE FROM footer_items WHERE section_id = ?",
      id
    );

    await dbRun(
      env,
      "DELETE FROM footer_sections WHERE id = ?",
      id
    );

    return json({ ok: true });
  } catch {
    return json({ error: "Unable to delete footer section." }, 500);
  }
    
