import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig, getSupabaseServiceRoleKey } from "@/src/lib/env";

let adminClient: SupabaseClient | undefined;

export function createSupabaseAdminClient() {
  if (!adminClient) {
    const { url } = getPublicSupabaseConfig();
    adminClient = createClient(url, getSupabaseServiceRoleKey(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return adminClient;
}
