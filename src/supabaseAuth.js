import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabaseConfig.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function signInWithGoogle(redirectTo = window.location.origin) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  return { data, error };
}

export async function signOut() {
  await supabase.auth.signOut();
  try { localStorage.clear(); } catch (error) { /* ignore unavailable storage */ }
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function checkEmailAccess(email) {
  if (!email) return null;
  try {
    const { data, error } = await supabase
      .from("allowed_emails")
      .select("role")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();
    if (error) {
      console.warn("[checkEmailAccess] query error:", error.message);
      return null;
    }
    return data?.role || null;
  } catch (error) {
    console.warn("[checkEmailAccess] exception:", error);
    return null;
  }
}
