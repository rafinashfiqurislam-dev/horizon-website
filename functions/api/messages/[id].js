
import { dbRun } from "../../_lib/db.js";
import {
  json,
  readJson,
  validId
} from "../../_lib/security.js";
import { adminRequest } from "../../_lib/auth.js";

export async function onRequestPatch({ request, params, env }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    if (!validId(params.id)) {
      return json({ error: "Invalid message ID." }, 400);
    }

    const body = await readJson(request);

    if (![0, 1].includes(body.is_read)) {
      return json({ error: "Invalid read status." }, 400);
    }

    const result = await dbRun(
      env,
      "UPDATE messages SET is_read = ? WHERE id = ?",
      body.is_read,
      Number(params.id)
    );

    if (!result.meta?.changes) {
      return json({ error: "Message not found." }, 404);
    }

    return json({ ok: true });
  } catch (error) {
    if (error.message === "Request body is too large.") {
      return json({ error: error.message }, 413);
    }

    return json({ error: "Unable to update message." }, 500);
  }
}
