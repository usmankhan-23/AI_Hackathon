import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { migrateArchivedEdition, type ArchivedEdition } from "@/lib/edition-archive";
import { getAuthenticatedAccount } from "@/lib/supabase/account";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

function stableEditionUuid(userId: string, editionDate: string): string {
  const namespace = Buffer.from("d7eb321f6a55464f93fe87a15970a514", "hex");
  const hash = createHash("sha1").update(namespace).update(`${userId}\0${editionDate}`).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const value = hash.toString("hex").slice(0, 32);
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export async function GET() {
  try {
    const { supabase, userId } = await getAuthenticatedAccount();
    if (!userId) return json({ error: "Sign in to access saved editions." }, 401);
    const { data, error } = await supabase.from("saved_editions")
      .select("id,user_id,title,edition_data,created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(60);
    if (error) return json({ error: "Your saved editions could not be loaded. Check the table and RLS policies." }, 503);
    const editions = (data ?? []).map((row) => migrateArchivedEdition(row.edition_data))
      .filter((edition): edition is ArchivedEdition => edition !== null)
      .sort((a, b) => b.editionDate.localeCompare(a.editionDate));
    return json({ editions });
  } catch {
    return json({ error: "Your saved editions service is unavailable." }, 503);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, userId } = await getAuthenticatedAccount();
    if (!userId) return json({ error: "Sign in to save editions." }, 401);
    const input: unknown = await request.json();
    const edition = migrateArchivedEdition(input);
    if (!edition || !/^\d{4}-\d{2}-\d{2}$/.test(edition.editionDate)) {
      return json({ error: "The edition snapshot is invalid." }, 400);
    }

    const { error } = await supabase.from("saved_editions").upsert({
      id: stableEditionUuid(userId, edition.editionDate),
      user_id: userId,
      title: `Subah · ${edition.editionDate}`,
      edition_data: edition,
      created_at: edition.createdAt,
    }, { onConflict: "id" });
    if (error) return json({ error: "This edition could not be saved. Check the table and RLS policies." }, 503);
    return json({ saved: true, editionId: edition.id });
  } catch {
    return json({ error: "Your saved editions service is unavailable." }, 503);
  }
}
