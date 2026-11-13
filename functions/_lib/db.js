
export function getDB(env) {
  if (!env?.DB) {
    throw new Error("Cloudflare D1 database is not configured.");
  }

  return env.DB;
}

export async function dbAll(env, sql, ...values) {
  const result = await getDB(env)
    .prepare(sql)
    .bind(...values)
    .all();

  return result.results || [];
}

export async function dbFirst(env, sql, ...values) {
  return await getDB(env)
    .prepare(sql)
    .bind(...values)
    .first();
}

export async function dbRun(env, sql, ...values) {
  return await getDB(env)
    .prepare(sql)
    .bind(...values)
    .run();
}

export async function dbBatch(env, statements) {
  if (!Array.isArray(statements) || statements.length === 0) {
    return [];
  }

  return await getDB(env).batch(statements);
}

export function getInsertId(result) {
  return result?.meta?.last_row_id ?? null;
}
