
import {
  dbAll,
  dbBatch,
  getDB,
  getInsertId
} from "../../_lib/db.js";

import {
  json,
  readJson,
  validImageUrl,
  validButtonUrl,
  textValue
} from "../../_lib/security.js";

import { adminRequest } from "../../_lib/auth.js";

const starterQuestions = [
  ["What is this product or service?", "এই প্রোডাক্ট বা সার্ভিসটি কী?"],
  ["What does it do?", "এটি কী কাজ করে?"],
  ["How can I get started?", "আমি কীভাবে ব্যবহার শুরু করব?"],
  ["Who is this designed for?", "এটি কাদের জন্য তৈরি?"],
  ["Is it free or paid?", "এটি কি ফ্রি, নাকি পেইড?"],
  ["How do I access it?", "আমি কীভাবে এটি ব্যবহার করতে পারব?"],
  ["What are its main features?", "এর প্রধান ফিচারগুলো কী কী?"],
  ["Does it require an account?", "এটি ব্যবহার করতে কি অ্যাকাউন্ট লাগবে?"],
  ["Can I use it on mobile?", "আমি কি মোবাইলে এটি ব্যবহার করতে পারব?"],
  ["Where can I learn more?", "এটি সম্পর্কে আরও কোথায় জানতে পারব?"],
  ["How can I contact support?", "আমি কীভাবে সাপোর্টের সঙ্গে যোগাযোগ করব?"],
  ["Is there a launch date?", "এটি কবে চালু হবে?"]
];

function itemValues(body = {}) {
  return {
    type: textValue(body.type, 100),
    name: textValue(body.name, 200),
    short_perception: textValue(body.short_perception, 500),
    image: textValue(body.image, 1000),
    description: textValue(body.description, 10000),
    button_text: textValue(body.button_text, 100),
    button_url: textValue(body.button_url, 2000),
    status: ["draft", "published", "coming_soon"].includes(body.status)
      ? body.status
      : "draft",
    publish_at: textValue(body.publish_at, 100)
  };
}

export async function onRequestGet({ request, env }) {
  try {
    const { admin, response } = await adminRequest(request, env);
    if (response) return response;

    const items = await dbAll(
      env,
      "SELECT * FROM items ORDER BY id DESC"
    );

    return json(items);
  } catch {
    return json({ error: "Unable to load items." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { admin, response } = await adminRequest(request, env);
    if (response) return response;

    const body = await readJson(request);
    const x = itemValues(body);

    if (!x.name || !x.type) {
      return json({
        error: "Name and content type are required."
      }, 400);
    }

    if (!validImageUrl(x.image) || !validButtonUrl(x.button_url)) {
      return json({ error: "Invalid image or button URL." }, 400);
    }

    const statements = [
      getDB(env).prepare(`
        INSERT INTO items(
          type, name, short_perception, image, description,
          button_text, button_url, status, publish_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        x.type,
        x.name,
        x.short_perception,
        x.image,
        x.description,
        x.button_text,
        x.button_url,
        x.status,
        x.publish_at
      )
    ];

    for (const q of starterQuestions) {
      statements.push(
        getDB(env).prepare(`
          INSERT INTO faqs(item_name, question_en, question_bn, answer)
          VALUES (?, ?, ?, ?)
        `).bind(x.name, q[0], q[1], "")
      );
    }

    const results = await dbBatch(env, statements);
    const id = getInsertId(results[0]);

    return json({ id });
  } catch (error) {
    if (error.message === "Request body is too large.") {
      return json({ error: error.message }, 413);
    }

    return json({ error: "Unable to create item." }, 500);
  }
  }
    
