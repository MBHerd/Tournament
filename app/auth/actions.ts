"use server";

import { redirect } from "next/navigation";
import { getAppUrl, getAuthRedirectPath, isSupabaseConfigured } from "@/src/lib/env";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

function fieldValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNext(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function loginRedirect(error: string, next: string) {
  const params = new URLSearchParams({ error, next });
  return `/login?${params.toString()}`;
}

export async function signInWithEmail(formData: FormData) {
  const email = fieldValue(formData, "email");
  const password = fieldValue(formData, "password");
  const next = normalizeNext(fieldValue(formData, "next") || "/");

  if (!isSupabaseConfigured()) redirect(loginRedirect("Supabase is not configured yet.", next));
  if (!email || !password) redirect(loginRedirect("Enter an email and password.", next));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect(loginRedirect("Sign in failed. Check the account and password.", next));
  redirect(next);
}

export async function signInWithGoogle(formData: FormData) {
  const next = normalizeNext(fieldValue(formData, "next") || "/");

  if (!isSupabaseConfigured()) redirect(loginRedirect("Supabase is not configured yet.", next));

  const redirectTo = new URL(getAuthRedirectPath(), getAppUrl());
  redirectTo.searchParams.set("next", next);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirectTo.toString() }
  });

  if (error || !data.url) redirect(loginRedirect("Google sign in is not available yet.", next));
  redirect(data.url);
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
