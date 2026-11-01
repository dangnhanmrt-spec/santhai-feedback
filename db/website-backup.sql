CREATE OR REPLACE FUNCTION feedback_private.feedback_backup_snapshot(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '55s'
AS $function$
DECLARE v_data jsonb := '{}';v_table text;v_rows jsonb;
BEGIN
 PERFORM feedback_private.assert_backup_token(p_token);
 FOREACH v_table IN ARRAY ARRAY['feedbacks','stores','allowed_emails','audit_log_feedback','feedback_app_members','feedback_module_access','audit_stores','audit_error_types','audit_inspections','audit_violations','audit_hygiene','audit_activity_log','audit_import_batches','audit_import_cells','app_backup_runs','website_store_profiles','website_menus','website_activity'] LOOP
 EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),''[]''::jsonb) FROM public.%I t',v_table) INTO v_rows;
 v_data:=v_data||jsonb_build_object(v_table,v_rows);
 END LOOP;
 RETURN jsonb_build_object('format_version',2,'snapshot_at',transaction_timestamp(),'project_ref','stxymyjwxdtfxkvmsgmz','tables',v_data,
 'columns',(SELECT jsonb_agg(to_jsonb(c) ORDER BY table_name,ordinal_position) FROM information_schema.columns c WHERE table_schema='public' AND v_data ? table_name),
 'constraints',(SELECT jsonb_agg(jsonb_build_object('table',r.relname,'name',c.conname,'definition',pg_get_constraintdef(c.oid))) FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' AND v_data ? r.relname));
END $function$
