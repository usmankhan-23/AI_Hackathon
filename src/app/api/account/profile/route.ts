import { NextResponse } from "next/server";
import { normalizeReadingProfile } from "@/lib/reading-intelligence";
import { getAuthenticatedAccount } from "@/lib/supabase/account";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET() {
  try {
    const { supabase, userId } = await getAuthenticatedAccount();
    if (!userId) return json({ error: "Sign in to access your reading profile." }, 401);
    const { data, error } = await supabase.from("reading_profiles")
      .select("regions,topics").eq("user_id", userId).maybeSingle();
    if (error) return json({ error: "Your reading profile could not be loaded." }, 503);
    return json({ profile: data ? normalizeReadingProfile({ regions: data.regions, subjects: data.topics }) : null });
  } catch {
    return json({ error: "Your reading profile service is unavailable." }, 503);
  }
}

export async function PUT(request: Request) {
  try {
    const { supabase, userId } = await getAuthenticatedAccount();
    if (!userId) return json({ error: "Sign in to save your reading profile." }, 401);
    const input: unknown = await request.json();
    if (!input || typeof input !== "object") return json({ error: "The reading profile is invalid." }, 400);
    const profile = normalizeReadingProfile(input);
    const { error } = await supabase.from("reading_profiles").upsert({
      user_id: userId,
      regions: profile.regions,
      topics: profile.subjects,
    }, { onConflict: "user_id" });
    if (error) return json({ error: "Your reading profile could not be saved. Check the table and RLS policies." }, 503);
    return json({ profile });
  } catch {
    return json({ error: "Your reading profile service is unavailable." }, 503);
  }
}
