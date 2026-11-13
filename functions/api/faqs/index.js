
import { dbAll, dbRun } from "../../_lib/db.js";
import {
  json,
  readJson,
  textValue
} from "../../_lib/security.js";
import { adminRequest } from "../../_lib/auth.js";

function faqValues(body = {}) {
  return {
    item_name: textValue(body.item_name, 200),
    question_en: textValue(body.question_en, 500),
    question_bn: textValue(body.question_bn, 500),
    answer: textValue(body.answer, 5000)
  };
}

export async function onRequestGet({ request, env }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    const faqs = await dbAll(
      env,
      "SELECT * FROM faqs ORDER BY id DESC"
    );

    return json(faqs);
  } catch {
    return json({ error: "Unable to load FAQs." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { response } = await adminRequest(request, env);
    if (response) return response;

    const body = await readJson(request);
    const faq = faqValues(body);

    if (!faq.item_name || !faq.question_en || !faq.question_bn) {
      return json({
        error: "Product name and both questions are required."
      }, 400);
    }

    const result = await dbRun(
      env,
      `INSERT INTO faqs
        (item_name, question_en, question_bn, answer)
       VALUES (?, ?, ?, ?)`,
      faq.item_name,
      faq.question_en,
      faq.question_bn,
      faq.answer
    );

    return json({
      ok: true,
      id: result.meta?.last_row_id ?? null
    }, 201);
  } catch (error) {
    if (error.message === "Request body is too large.") {
      return json({ error: error.message }, 413);
    }

    return json({ error: "Unable to save FAQ." }, 500);
  }
}
