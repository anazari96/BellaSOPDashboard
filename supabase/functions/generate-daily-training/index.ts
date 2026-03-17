// Supabase Edge Function: generate-daily-training
// Triggered daily by pg_cron to generate training sessions for all staff.
//
// Setup pg_cron (run once in SQL editor):
//
//   select cron.schedule(
//     'generate-daily-training',
//     '0 6 * * *',
//     $$
//     select net.http_post(
//       url := '<YOUR_SUPABASE_PROJECT_URL>/functions/v1/generate-daily-training',
//       headers := jsonb_build_object(
//         'Authorization', 'Bearer <YOUR_SUPABASE_ANON_KEY>',
//         'Content-Type', 'application/json'
//       ),
//       body := '{}'::jsonb
//     );
//     $$
//   );

Deno.serve(async () => {
  const appUrl = Deno.env.get("APP_URL");
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (!appUrl || !cronSecret) {
    return new Response(
      JSON.stringify({ error: "Missing APP_URL or CRON_SECRET env vars" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const response = await fetch(`${appUrl}/api/generate-training`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": cronSecret,
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
