
import { dbFirst, dbRun } from "../../_lib/db.js";
import {
  json,
  readJson,
  validId,
  textValue
} from "../../_lib/security.js";
import { adminRequest } from "../../_lib/auth.js";

export async function onRequestPut({ request, params, env }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    if (!validId(params.id)) {
      return json({ error: "Invalid FAQ ID." }, 400);
    }

    const body = await readJson(request);

    const item_name = textValue(body.item_name, 200);
    const question_en = textValue(body.question_en, 500);
    const question_bn = textValue(body.question_bn, 500);
    const answer = textValue(body.answer, 5000);

    if (!item_name || !question_en || !question_bn) {
      return json({ error: "Product name and both questions are required." }, 400);
    }

    const existing = await dbFirst(
      env,
      "SELECT id FROM faqs WHERE id = ?",
      Number(params.id)
    );

    if (!existing) {
      return json({ error: "FAQ not found." }, 404);
    }

    await dbRun(
      env,
      `UPDATE faqs
       SET item_name = ?, question_en = ?, question_bn = ?, answer = ?
       WHERE id = ?`,
      item_name,
      question_en,
      question_bn,
      answer,
      Number(params.id)
    );

    return json({ ok: true });
  } catch (error) {
    if (error.message === "Request body is too large.") {
      return json({ error: error.message }, 413);
    }

    return json({ error: "Unable to update FAQ." }, 500);
  }
}

export async function onRequestDelete({ request, params, env }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    if (!validId(params.id)) {
      return json({ error: "Invalid FAQ ID." }, 400);
    }

    const result = await dbRun(
      env,
      "DELETE FROM faqs WHERE id = ?",
      Number(params.id)
    );

    if (!result.meta?.changes) {
      return json({ error: "FAQ not found." }, 404);
    }

    return json({ ok: true });
  } catch {
    return json({ error: "Unable to delete FAQ." }, 500);
  }
}
