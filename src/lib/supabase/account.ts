import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getAuthenticatedAccount() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims && typeof data.claims.sub === "string" ? data.claims.sub : null;
  return { supabase, userId, error };
}
