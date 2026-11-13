
import { dbAll } from "../_lib/db.js";
import { json } from "../_lib/security.js";

export async function onRequestGet({ env }) {
  try {
    const faqs = await dbAll(
      env,
      "SELECT id, item_name, question_en, question_bn, answer FROM faqs ORDER BY id DESC"
    );

    return json(faqs);
  } catch {
    return json(
      { error: "Unable to load help information." },
      500
    );
  }
}
