-- Scoped RPC timeouts only; shared application roles retain their current limits.
ALTER FUNCTION public.feedback_backup_snapshot(text) SET statement_timeout TO '55s';
ALTER FUNCTION public.feedback_restore_snapshot(text,jsonb,text) SET statement_timeout TO '55s';
NOTIFY pgrst,'reload schema';
