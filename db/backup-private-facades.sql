-- Privileged implementations stay outside the exposed API schema.
ALTER FUNCTION public.feedback_backup_snapshot(text) SET SCHEMA feedback_private;
ALTER FUNCTION public.feedback_backup_begin(text,text) SET SCHEMA feedback_private;
ALTER FUNCTION public.feedback_backup_log(text,jsonb) SET SCHEMA feedback_private;
ALTER FUNCTION public.feedback_restore_snapshot(text,jsonb,text) SET SCHEMA feedback_private;
GRANT USAGE ON SCHEMA feedback_private TO anon;

CREATE FUNCTION public.feedback_backup_snapshot(p_token text) RETURNS jsonb
 LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' SET statement_timeout='55s'
 AS $$ SELECT feedback_private.feedback_backup_snapshot(p_token) $$;
CREATE FUNCTION public.feedback_backup_begin(p_token text,p_actor text) RETURNS uuid
 LANGUAGE sql SECURITY INVOKER SET search_path=''
 AS $$ SELECT feedback_private.feedback_backup_begin(p_token,p_actor) $$;
CREATE FUNCTION public.feedback_backup_log(p_token text,p_run jsonb) RETURNS uuid
 LANGUAGE sql SECURITY INVOKER SET search_path=''
 AS $$ SELECT feedback_private.feedback_backup_log(p_token,p_run) $$;
CREATE FUNCTION public.feedback_restore_snapshot(p_token text,p_snapshot jsonb,p_actor text) RETURNS jsonb
 LANGUAGE sql SECURITY INVOKER SET search_path='' SET statement_timeout='55s'
 AS $$ SELECT feedback_private.feedback_restore_snapshot(p_token,p_snapshot,p_actor) $$;
REVOKE ALL ON FUNCTION public.feedback_backup_snapshot(text),public.feedback_backup_begin(text,text),public.feedback_backup_log(text,jsonb),public.feedback_restore_snapshot(text,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.feedback_backup_snapshot(text),public.feedback_backup_begin(text,text),public.feedback_backup_log(text,jsonb),public.feedback_restore_snapshot(text,jsonb,text) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
