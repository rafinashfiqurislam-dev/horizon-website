
import { getSession, json, sameOrigin } from "./security.js";

export async function requireAdmin(request, env) {
  const admin = await getSession(
    request,
    env.SESSION_SECRET
  );

  if (!admin) {
    return {
      admin: null,
      response: json(
        { error: "Please log in." },
        401
      )
    };
  }

  return {
    admin,
    response: null
  };
}

export function requireSameOrigin(request) {
  if (!sameOrigin(request)) {
    return json(
      { error: "Invalid request origin." },
      403
    );
  }

  return null;
}

export async function adminRequest(request, env) {
  const originError = requireSameOrigin(request);

  if (originError) {
    return {
      admin: null,
      response: originError
    };
  }

  return await requireAdmin(request, env);
}
