import { createClient } from "npm:@supabase/supabase-js@2";
const origin = Deno.env.get("APP_ORIGIN") || "";
Deno.serve(async (request: Request) => {
  const headers = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
  if (!origin || request.headers.get("Origin") !== origin)
    return new Response('{"error":"Forbidden"}', { status: 403, headers });
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (request.method !== "POST")
    return new Response('{"error":"Method not allowed"}', {
      status: 405,
      headers,
    });
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!token)
    return new Response('{"error":"Sign in required"}', {
      status: 401,
      headers,
    });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user)
    return new Response('{"error":"Sign in required"}', {
      status: 401,
      headers,
    });
  const deleted = await admin.auth.admin.deleteUser(data.user.id);
  return new Response(
    JSON.stringify(
      deleted.error ? { error: "Deletion failed" } : { deleted: true },
    ),
    { status: deleted.error ? 500 : 200, headers },
  );
});
