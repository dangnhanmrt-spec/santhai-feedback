import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://stxymyjwxdtfxkvmsgmz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0eHlteWp3eGR0Znhrdm1zZ216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4Nzg4ODIsImV4cCI6MjA5MjQ1NDg4Mn0.dxF-84q5CSoT21b__zq8XgUfyRuSAwIov9PL269WWm4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  return { data, error };
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function checkEmailAccess(email) {
  const { data, error } = await supabase
    .from('allowed_emails')
    .select('role')
    .eq('email', email.toLowerCase().trim())
    .single();
  if (error || !data) return null;
  return data.role;
}

export async function loadAllowedEmails() {
  const { data, error } = await supabase
    .from('allowed_emails').select('*').order('created_at', { ascending: true });
  if (error) return [];
  return data || [];
}

export async function saveAllowedEmail(email, role) {
  const { error } = await supabase
    .from('allowed_emails')
    .upsert({ email: email.toLowerCase().trim(), role }, { onConflict: 'email' });
  return !error;
}

export async function deleteAllowedEmail(email) {
  const { error } = await supabase
    .from('allowed_emails').delete().eq('email', email);
  return !error;
}

export async function loadFeedbacks() {
  const { data, error } = await supabase
    .from('feedbacks').select('*').order('feedback_date', { ascending: false });
  if (error) return [];
  return data.map(r => ({
    id: r.id,
    storeId: r.store_id,
    errorType: r.error_type,
    date: r.feedback_date,
    note: r.note || '',
    submittedBy: r.submitted_by || '',
    createdAt: r.created_at,
  }));
}

export async function saveFeedback(fb) {
  const { error } = await supabase.from('feedbacks').upsert({
    id: fb.id,
    store_id: fb.storeId,
    error_type: fb.errorType,
    feedback_date: fb.date,
    note: fb.note || '',
    submitted_by: fb.submittedBy || '',
  }, { onConflict: 'id' });
  return !error;
}

export async function deleteFeedback(id) {
  const { error } = await supabase.from('feedbacks').delete().eq('id', id);
  return !error;
}

export async function writeLog(userEmail, userName, action, targetType, targetName, detail) {
  await supabase.from('audit_log_feedback').insert({
    user_email: userEmail || 'unknown',
    user_name: userName || '',
    action, target_type: targetType,
    target_name: targetName || '',
    detail: detail || '',
  });
}
