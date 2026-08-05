import "server-only";

import type { CurrentActor } from "@/features/access-control/types/access-control";
import type { HomeDashboardData, HomeSpiritualMessage } from "@/features/dashboard/types/home-dashboard";
import { getReportingDatasetForActor } from "@/features/reports/data/reporting-service";
import { getAdminClient } from "@/infrastructure/supabase/admin-client";

const dateInZone = (timeZone: string) => new Intl.DateTimeFormat("en-CA", {
  timeZone, year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

const hourInZone = (timeZone: string) => Number(new Intl.DateTimeFormat("en-US", {
  timeZone, hour: "2-digit", hourCycle: "h23",
}).format(new Date()));

async function loadSpiritualMessage(today: string): Promise<HomeSpiritualMessage | null> {
  const { data, error } = await getAdminClient().from("home_spiritual_messages")
    .select("message_text, reference, sort_order")
    .eq("active", true)
    .lte("starts_on", today)
    .or(`ends_on.is.null,ends_on.gte.${today}`)
    .order("sort_order")
    .order("created_at");

  // This content source is additive. Until its migration is deployed/configured,
  // Home intentionally renders no placeholder or hardcoded verse.
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return null;
    throw error;
  }
  if (!data?.length) return null;
  const epochDay = Math.floor(Date.parse(`${today}T00:00:00Z`) / 86_400_000);
  const selected = data[epochDay % data.length];
  return { text: selected.message_text, reference: selected.reference };
}

export async function getHomeDashboardData(actor: CurrentActor): Promise<HomeDashboardData> {
  const admin = getAdminClient();
  const provisionalToday = dateInZone("Africa/Cairo");
  const settingsResult = await admin.from("service_settings")
    .select("timezone, meeting_weekday")
    .lte("effective_from", provisionalToday)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (settingsResult.error) throw settingsResult.error;

  const timeZone = settingsResult.data?.timezone || "Africa/Cairo";
  const today = dateInZone(timeZone);
  const [reporting, spiritualMessage] = await Promise.all([
    getReportingDatasetForActor(actor),
    loadSpiritualMessage(today),
  ]);

  return {
    actor: {
      fullName: actor.fullName,
      roles: actor.roles,
      permissions: actor.permissions,
      classIds: actor.classIds,
    },
    reporting,
    today,
    currentHour: hourInZone(timeZone),
    meetingWeekday: settingsResult.data?.meeting_weekday ?? null,
    spiritualMessage,
  };
}
