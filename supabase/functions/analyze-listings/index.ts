import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Get company_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("user_id", user.id)
      .single();
    if (!profile) throw new Error("No profile");

    const companyId = profile.company_id;

    // Get all available/testing devices that are not listed
    const { data: devices, error: devErr } = await supabase
      .from("devices")
      .select("id, model, memory, color, status, listing_status, listing_published_at, created_at")
      .eq("company_id", companyId)
      .in("status", ["available", "testing", "reserved"]);
    if (devErr) throw devErr;

    // Get existing active listing tasks to avoid duplicates
    const { data: existingTasks } = await supabase
      .from("tasks")
      .select("title, status")
      .eq("company_id", companyId)
      .neq("status", "done")
      .like("title", "%Опубликовать%");

    const existingTitles = new Set((existingTasks || []).map(t => t.title));

    // Get first employee of the company for assignment
    const { data: employees } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("company_id", companyId)
      .limit(5);

    const assignTo = employees?.[0]?.user_id || user.id;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const tasksToCreate: any[] = [];
    const devicesToUpdate: { id: string; listing_status: string }[] = [];
    const notifications: any[] = [];

    for (const device of devices || []) {
      const desc = [device.model, device.memory, device.color].filter(Boolean).join(" · ");

      // 1. Not listed devices -> create publish task
      if (device.listing_status === "not_listed") {
        const taskTitle = `Опубликовать объявление: ${device.model}${device.memory ? ` ${device.memory}` : ""}`;
        if (!existingTitles.has(taskTitle)) {
          tasksToCreate.push({
            company_id: companyId,
            title: taskTitle,
            description: desc,
            assigned_to: assignTo,
            due_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            created_by: user.id,
            is_management_task: false,
          });
          existingTitles.add(taskTitle);
        }

        // 3-day reminder for manager
        const deviceCreated = new Date(device.created_at);
        if (deviceCreated < threeDaysAgo) {
          notifications.push({
            company_id: companyId,
            title: `Телефон не опубликован уже ${Math.floor((now.getTime() - deviceCreated.getTime()) / (24 * 60 * 60 * 1000))} дней`,
            message: `${desc} — объявление до сих пор не создано`,
            type: "listing_reminder",
          });
        }
      }

      // 2. Listed devices older than 30 days -> needs relist
      if (device.listing_status === "listed" && device.listing_published_at) {
        const publishedAt = new Date(device.listing_published_at);
        if (publishedAt < thirtyDaysAgo) {
          devicesToUpdate.push({ id: device.id, listing_status: "needs_relist" });

          const taskTitle = `Перевыложить объявление: ${device.model}${device.memory ? ` ${device.memory}` : ""}`;
          if (!existingTitles.has(taskTitle)) {
            tasksToCreate.push({
              company_id: companyId,
              title: taskTitle,
              description: `${desc} — объявление опубликовано более 30 дней назад`,
              assigned_to: assignTo,
              due_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              created_by: user.id,
              is_management_task: false,
            });
            existingTitles.add(taskTitle);
          }
        }
      }
    }

    // Batch insert tasks
    if (tasksToCreate.length > 0) {
      const { error: taskErr } = await supabase.from("tasks").insert(tasksToCreate);
      if (taskErr) console.error("Task insert error:", taskErr);
    }

    // Update device listing statuses
    for (const upd of devicesToUpdate) {
      await supabase.from("devices").update({ listing_status: upd.listing_status }).eq("id", upd.id);
    }

    // Insert notifications (deduplicated by not checking, just insert)
    if (notifications.length > 0) {
      // Only insert max 5 notifications per run
      const { error: notifErr } = await supabase.from("notifications").insert(notifications.slice(0, 5));
      if (notifErr) console.error("Notification insert error:", notifErr);
    }

    return new Response(
      JSON.stringify({
        tasks_created: tasksToCreate.length,
        devices_updated: devicesToUpdate.length,
        notifications_sent: Math.min(notifications.length, 5),
        total_devices_analyzed: (devices || []).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-listings error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
