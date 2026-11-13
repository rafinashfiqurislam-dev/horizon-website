const SESSION_COOKIE = "horizon.sid";
const SESSION_SECONDS = 8 * 60 * 60;
const PBKDF2_ITERATIONS = 310000;

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}

export async function readJson(request) {
  const MAX_SIZE = 1024 * 1024;
  const length = Number(request.headers.get("Content-Length") || 0);

  if (length > MAX_SIZE) {
    throw new Error("Request body is too large.");
  }

  if (!request.body) {
    throw new Error("Request body is required.");
  }

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      total += value.length;

      if (total > MAX_SIZE) {
        await reader.cancel();
        throw new Error("Request body is too large.");
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }

  return JSON.parse(new TextDecoder().decode(body));
}

export function textValue(value, max = 5000) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function validId(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

export function validEmail(value) {
  return typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validImageUrl(value) {
  if (!value) return true;
  if (typeof value !== "string" || value.length > 1000) return false;

  return value.startsWith("/uploads/") ||
    value.startsWith("https://") ||
    value.startsWith("http://");
}

export function validButtonUrl(value) {
  if (!value) return true;
  if (typeof value !== "string" || value.length > 2000) return false;

  if (value.startsWith("/") && !value.startsWith("//")) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

async function derivePassword(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  return new Uint8Array(await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    key,
    256
  ));
}

export async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 12 || password.length > 128) {
    throw new Error("Password must be 12 to 128 characters.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt, PBKDF2_ITERATIONS);

  return [
    "pbkdf2-sha256",
    PBKDF2_ITERATIONS,
    toBase64Url(salt),
    toBase64Url(hash)
  ].join("$");
}

export async function verifyPassword(password, stored) {
  if (typeof password !== "string" || typeof stored !== "string") return false;

  try {
    const parts = stored.split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256") return false;

    const iterations = Number(parts[1]);
    if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 1000000) {
      return false;
    }

    const salt = fromBase64Url(parts[2]);
    const expected = fromBase64Url(parts[3]);
    if (salt.length !== 16 || expected.length !== 32) return false;

    const actual = await derivePassword(password, salt, iterations);

    let difference = 0;
    for (let i = 0; i < expected.length; i++) {
      difference |= expected[i] ^ actual[i];
    }

    return difference === 0;
  } catch {
    return false;
  }
}

async function sessionKey(secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("SESSION_SECRET is missing or too short.");
  }

  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSession(admin, secret) {
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({
    id: admin.id,
    username: admin.username,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS
  })));

  const key = await sessionKey(secret);
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
  );

  return payload + "." + toBase64Url(signature);
}

export async function getSession(request, secret) {
  try {
    const cookie = request.headers.get("Cookie") || "";
    const entry = cookie.split(";").map(x => x.trim())
      .find(x => x.startsWith(SESSION_COOKIE + "="));

    if (!entry) return null;

    const token = entry.slice(SESSION_COOKIE.length + 1);
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const key = await sessionKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(parts[1]),
      new TextEncoder().encode(parts[0])
    );

    if (!valid) return null;

    const session = JSON.parse(
      new TextDecoder().decode(fromBase64Url(parts[0]))
    );

    if (!session.id || !session.username || session.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return { id: session.id, username: session.username };
  } catch {
    return null;
  }
}

export function sessionCookie(token) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
