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
  try { localStorage.clear(); } catch (e) {}
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
      .from('allowed_emails')
      .select('role')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();
    if (error) {
      console.warn('[checkEmailAccess] query error:', error.message);
      return null;
    }
    return data?.role || null;
  } catch (err) {
    console.warn('[checkEmailAccess] exception:', err);
    return null;
  }
}

export async function loadAllowedEmails() {
  try {
    const { data, error } = await supabase
      .from('allowed_emails').select('*').order('created_at', { ascending: true });
    if (error) { console.warn('[loadAllowedEmails]', error.message); return []; }
    return data || [];
  } catch (err) { console.warn('[loadAllowedEmails]', err); return []; }
}

export async function saveAllowedEmail(email, role) {
  const { error } = await supabase
    .from('allowed_emails')
    .upsert({ email: email.toLowerCase().trim(), role }, { onConflict: 'email' });
  if (error) console.warn('[saveAllowedEmail]', error.message);
  return !error;
}

export async function deleteAllowedEmail(email) {
  const { error } = await supabase
    .from('allowed_emails').delete().eq('email', email);
  if (error) console.warn('[deleteAllowedEmail]', error.message);
  return !error;
}

export async function loadFeedbacks() {
  try {
    const { data, error } = await supabase
      .from('feedbacks').select('*').order('feedback_date', { ascending: false });
    if (error) { console.warn('[loadFeedbacks]', error.message); return []; }
    return (data || []).map(r => ({
      id: r.id,
      storeId: r.store_id,
      errorType: r.error_type,
      date: r.feedback_date,
      note: r.note || '',
      submittedBy: r.submitted_by || '',
      createdAt: r.created_at,
    }));
  } catch (err) { console.warn('[loadFeedbacks]', err); return []; }
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
  if (error) {
    console.warn('[saveFeedback]', error.message);
    throw new Error(error.message);
  }
  return true;
}

export async function deleteFeedback(id) {
  const { error } = await supabase.from('feedbacks').delete().eq('id', id);
  if (error) console.warn('[deleteFeedback]', error.message);
  return !error;
}

export async function writeLog(userEmail, userName, action, targetType, targetName, detail) {
  try {
    await supabase.from('audit_log_feedback').insert({
      user_email: userEmail || 'unknown',
      user_name: userName || '',
      action, target_type: targetType,
      target_name: targetName || '',
      detail: detail || '',
    });
  } catch (err) { /* silent */ }
}

export async function loadStores() {
  try {
    const { data, error } = await supabase
      .from('stores').select('*').order('region_id').order('name');
    if (error) { console.warn('[loadStores]', error.message); return []; }
    return data || [];
  } catch (err) { console.warn('[loadStores]', err); return []; }
}

export async function addStore(id, name, regionId) {
  const { error } = await supabase.from('stores').insert({
    id: id.toLowerCase().trim().replace(/\s+/g, '_'),
    name: name.trim(),
    region_id: regionId,
    active: true,
  });
  if (error) { console.warn('[addStore]', error.message); throw new Error(error.message); }
  return true;
}

export async function toggleStoreActive(id, active) {
  const { error } = await supabase.from('stores').update({ active }).eq('id', id);
  if (error) { console.warn('[toggleStoreActive]', error.message); return false; }
  return true;
}

export async function loadAuditLog(limit = 30) {
  try {
    const { data, error } = await supabase
      .from('audit_log_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) { console.warn('[loadAuditLog]', error.message); return []; }
    return data || [];
  } catch (err) { console.warn('[loadAuditLog]', err); return []; }
}
