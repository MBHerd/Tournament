import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNext(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=Missing%20Supabase%20auth%20code.", request.url));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  } catch {
    return NextResponse.redirect(new URL("/login?error=Could%20not%20complete%20sign%20in.", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
