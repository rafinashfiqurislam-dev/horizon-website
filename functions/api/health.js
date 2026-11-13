
export async function onRequestGet({ env }) {
  return new Response(
    JSON.stringify({
      ok: true,
      service: "HORIZON",
      status: "operational",
      databaseConfigured: Boolean(env.DB),
      storageConfigured: Boolean(env.UPLOADS)
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}
