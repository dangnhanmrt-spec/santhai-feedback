CREATE OR REPLACE FUNCTION feedback_private.feedback_restore_snapshot(p_token text, p_snapshot jsonb, p_actor text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '55s'
AS $function$
DECLARE t text;rows jsonb;cols text;updates text;pk text;restored bigint:=0;n bigint;
BEGIN
 PERFORM feedback_private.assert_backup_token(p_token);
 IF p_snapshot->>'project_ref'<>'stxymyjwxdtfxkvmsgmz' OR (p_snapshot->>'format_version')::int NOT IN(1,2) OR jsonb_typeof(p_snapshot->'tables'->'feedbacks')<>'array' THEN RAISE EXCEPTION 'Invalid restore snapshot'; END IF;
 -- Shared stores/allowed_emails and access rights are deliberately not overwritten.
 FOREACH t IN ARRAY ARRAY['audit_stores','audit_error_types','audit_import_batches','audit_inspections','audit_violations','audit_hygiene','audit_import_cells','feedbacks','audit_log_feedback','audit_activity_log'] LOOP
 rows:=p_snapshot->'tables'->t;
 IF rows IS NULL THEN CONTINUE; END IF;
 IF jsonb_typeof(rows)<>'array' OR jsonb_array_length(rows)>1000000 THEN RAISE EXCEPTION 'Invalid table payload'; END IF;
 -- Older archives predate the independent Audit scope column.
 IF t='audit_stores' THEN
  SELECT coalesce(jsonb_agg(CASE WHEN item ? 'in_scope' THEN item ELSE
   item||jsonb_build_object('in_scope',coalesce(
    (SELECT a.in_scope FROM public.audit_stores a WHERE a.id=item->>'id'),
    coalesce((item->>'active')::boolean,false) AND NOT coalesce((item->>'historical_only')::boolean,false)
   )) END),'[]'::jsonb) INTO rows FROM jsonb_array_elements(rows) item;
 END IF;
 pk:=CASE WHEN t='audit_import_cells' THEN 'source_key' ELSE 'id' END;
 SELECT string_agg(quote_ident(column_name),',' ORDER BY ordinal_position),string_agg(format('%I=excluded.%I',column_name,column_name),',' ORDER BY ordinal_position) FILTER(WHERE column_name<>pk)
 INTO cols,updates FROM information_schema.columns WHERE table_schema='public' AND table_name=t;
 EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_recordset(NULL::public.%I,$1) ON CONFLICT(%I) DO UPDATE SET %s',t,cols,cols,t,pk,updates) USING rows;
 GET DIAGNOSTICS n=ROW_COUNT;restored:=restored+n;
 END LOOP;
 PERFORM setval(pg_get_serial_sequence('public.audit_log_feedback','id'),GREATEST((SELECT coalesce(max(id),1) FROM public.audit_log_feedback),(SELECT last_value FROM public.audit_log_feedback_id_seq)),true);
 PERFORM setval(pg_get_serial_sequence('public.audit_activity_log','id'),GREATEST((SELECT coalesce(max(id),1) FROM public.audit_activity_log),(SELECT last_value FROM public.audit_activity_log_id_seq)),true);
 INSERT INTO public.audit_activity_log(actor_email,action,entity,entity_id,details) VALUES(p_actor,'RESTORE','app_backup',coalesce(p_snapshot->>'snapshot_at',''),jsonb_build_object('restored',restored));
 RETURN jsonb_build_object('restored',restored);
END $function$;

