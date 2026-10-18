-- Additive Audit module. Legacy shared allowed_emails remains unchanged.
CREATE SCHEMA IF NOT EXISTS feedback_private;
REVOKE ALL ON SCHEMA feedback_private FROM PUBLIC;
GRANT USAGE ON SCHEMA feedback_private TO authenticated;

CREATE TABLE IF NOT EXISTS public.feedback_app_members (
 email text PRIMARY KEY CHECK (email=lower(trim(email))),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.feedback_module_access (
 email text NOT NULL REFERENCES public.feedback_app_members(email) ON DELETE CASCADE,
 module text NOT NULL CHECK(module IN ('feedback','audit')),
 role text NOT NULL CHECK(role IN ('admin','editor','viewer')),
 PRIMARY KEY(email,module)
);
INSERT INTO public.feedback_app_members(email) SELECT lower(trim(email)) FROM public.allowed_emails ON CONFLICT DO NOTHING;
INSERT INTO public.feedback_module_access(email,module,role)
 SELECT lower(trim(email)),'feedback',CASE WHEN role='admin' THEN 'admin' ELSE 'viewer' END FROM public.allowed_emails ON CONFLICT DO NOTHING;
INSERT INTO public.feedback_module_access(email,module,role)
 SELECT lower(trim(email)),'audit',CASE WHEN lower(email) IN ('dangnhan.mrt@gmail.com') THEN 'admin' WHEN role='admin' THEN 'editor' ELSE 'viewer' END FROM public.allowed_emails ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION feedback_private.module_role(p_module text) RETURNS text
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT a.role FROM public.feedback_module_access a
 WHERE a.email=lower(auth.jwt()->>'email') AND a.module=p_module AND auth.uid() IS NOT NULL
 $$;
CREATE OR REPLACE FUNCTION feedback_private.is_owner() RETURNS boolean
 LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND lower(auth.jwt()->>'email')='dangnhan.mrt@gmail.com'
 $$;
REVOKE ALL ON FUNCTION feedback_private.module_role(text),feedback_private.is_owner() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION feedback_private.module_role(text),feedback_private.is_owner() TO authenticated;

ALTER TABLE public.feedback_app_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_module_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY members_read ON public.feedback_app_members FOR SELECT TO authenticated USING (
 email=lower(auth.jwt()->>'email') OR (SELECT feedback_private.is_owner()) OR (SELECT feedback_private.module_role('audit'))='admin' OR (SELECT feedback_private.module_role('feedback'))='admin');
CREATE POLICY members_insert ON public.feedback_app_members FOR INSERT TO authenticated WITH CHECK((SELECT feedback_private.is_owner()));
CREATE POLICY members_delete ON public.feedback_app_members FOR DELETE TO authenticated USING((SELECT feedback_private.is_owner()) AND email<>'dangnhan.mrt@gmail.com');
CREATE POLICY access_read ON public.feedback_module_access FOR SELECT TO authenticated USING (
 email=lower(auth.jwt()->>'email') OR (SELECT feedback_private.is_owner()) OR (SELECT feedback_private.module_role('audit'))='admin' OR (SELECT feedback_private.module_role('feedback'))='admin');
CREATE POLICY access_insert ON public.feedback_module_access FOR INSERT TO authenticated WITH CHECK (
 (SELECT feedback_private.is_owner()) OR (module='audit' AND email<>'dangnhan.mrt@gmail.com' AND (SELECT feedback_private.module_role('audit'))='admin'));
CREATE POLICY access_update ON public.feedback_module_access FOR UPDATE TO authenticated USING (
 (SELECT feedback_private.is_owner()) OR (module='audit' AND email<>'dangnhan.mrt@gmail.com' AND (SELECT feedback_private.module_role('audit'))='admin')) WITH CHECK (
 (SELECT feedback_private.is_owner()) OR (module='audit' AND email<>'dangnhan.mrt@gmail.com' AND (SELECT feedback_private.module_role('audit'))='admin'));
CREATE POLICY access_delete ON public.feedback_module_access FOR DELETE TO authenticated USING (
 email<>'dangnhan.mrt@gmail.com' AND ((SELECT feedback_private.is_owner()) OR (module='audit' AND (SELECT feedback_private.module_role('audit'))='admin')));
GRANT SELECT,INSERT,DELETE ON public.feedback_app_members TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.feedback_module_access TO authenticated;
REVOKE ALL ON public.feedback_app_members,public.feedback_module_access FROM anon;

CREATE TABLE public.audit_stores (
 id text PRIMARY KEY,name text NOT NULL,region_id text NOT NULL,active boolean NOT NULL DEFAULT true,
 current_store_id text REFERENCES public.stores(id),historical_only boolean NOT NULL DEFAULT false
);
INSERT INTO public.audit_stores(id,name,region_id,active,current_store_id) SELECT id,name,region_id,active,id FROM public.stores;
CREATE TABLE public.audit_error_types (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE CHECK(length(trim(name))>0),
 active boolean NOT NULL DEFAULT true, created_by uuid DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.audit_inspections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),store_id text NOT NULL REFERENCES public.audit_stores(id),
 occurred_at timestamptz NOT NULL,audit_date date NOT NULL,note text NOT NULL DEFAULT '',
 source text NOT NULL DEFAULT 'manual' CHECK(source IN('manual','legacy')),
 counted_for_rate boolean NOT NULL DEFAULT true,
 source_keys jsonb NOT NULL DEFAULT '[]',created_by uuid DEFAULT auth.uid(),created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(source<>'legacy' OR counted_for_rate=false),
 CHECK(audit_date=(occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
);
CREATE INDEX audit_inspections_day ON public.audit_inspections(audit_date,store_id);
CREATE TABLE public.audit_violations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),inspection_id uuid NOT NULL REFERENCES public.audit_inspections(id) ON DELETE CASCADE,
 error_type_id uuid NOT NULL REFERENCES public.audit_error_types(id),description text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_violations_inspection ON public.audit_violations(inspection_id);
CREATE TABLE public.audit_hygiene (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),store_id text NOT NULL REFERENCES public.audit_stores(id),audit_date date NOT NULL,
 shift smallint NOT NULL CHECK(shift BETWEEN 1 AND 3),status text NOT NULL CHECK(status IN('not_submitted','pending','pass','fail','unavailable')),
 note text NOT NULL DEFAULT '',reason text NOT NULL DEFAULT '',source text NOT NULL DEFAULT 'manual' CHECK(source IN('manual','legacy')),
 source_keys jsonb NOT NULL DEFAULT '[]',created_by uuid DEFAULT auth.uid(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(store_id,audit_date,shift),CHECK(status<>'unavailable' OR length(trim(reason))>0)
);
CREATE INDEX audit_hygiene_day ON public.audit_hygiene(audit_date,store_id);
CREATE TABLE public.audit_activity_log (
 id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,actor_email text NOT NULL,action text NOT NULL,
 entity text NOT NULL,entity_id text NOT NULL,details jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.audit_import_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),file_name text NOT NULL,file_sha256 text NOT NULL UNIQUE,
 stats jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.audit_import_cells (
 source_key text PRIMARY KEY,batch_id uuid NOT NULL REFERENCES public.audit_import_batches(id),
 sheet text NOT NULL,cell text NOT NULL,store_label text,raw_value text,note text,
 status text NOT NULL,detail text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['audit_stores','audit_error_types','audit_inspections','audit_violations','audit_hygiene','audit_activity_log','audit_import_batches','audit_import_cells'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM anon',t);
 EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
 EXECUTE format('CREATE POLICY audit_read ON public.%I FOR SELECT TO authenticated USING ((SELECT feedback_private.module_role(''audit'')) IS NOT NULL)',t);
 END LOOP;
END $$;
GRANT INSERT,UPDATE ON public.audit_error_types TO authenticated;
CREATE POLICY types_insert ON public.audit_error_types FOR INSERT TO authenticated WITH CHECK((SELECT feedback_private.module_role('audit'))='admin' AND created_by=auth.uid());
CREATE POLICY types_update ON public.audit_error_types FOR UPDATE TO authenticated USING((SELECT feedback_private.module_role('audit'))='admin') WITH CHECK((SELECT feedback_private.module_role('audit'))='admin');
GRANT INSERT ON public.audit_inspections,public.audit_violations TO authenticated;
CREATE POLICY inspections_insert ON public.audit_inspections FOR INSERT TO authenticated WITH CHECK(
 (SELECT feedback_private.module_role('audit')) IN('admin','editor') AND source='manual' AND counted_for_rate AND created_by=auth.uid() AND source_keys='[]'::jsonb);
CREATE POLICY violations_insert ON public.audit_violations FOR INSERT TO authenticated WITH CHECK(
 (SELECT feedback_private.module_role('audit')) IN('admin','editor') AND EXISTS(SELECT 1 FROM public.audit_inspections i WHERE i.id=inspection_id AND i.source='manual' AND i.created_by=auth.uid()));
GRANT INSERT,UPDATE ON public.audit_hygiene TO authenticated;
CREATE POLICY hygiene_insert ON public.audit_hygiene FOR INSERT TO authenticated WITH CHECK(
 (SELECT feedback_private.module_role('audit')) IN('admin','editor') AND source='manual' AND created_by=auth.uid() AND source_keys='[]'::jsonb);
CREATE POLICY hygiene_update ON public.audit_hygiene FOR UPDATE TO authenticated USING(
 (SELECT feedback_private.module_role('audit')) IN('admin','editor') AND source='manual') WITH CHECK(
 (SELECT feedback_private.module_role('audit')) IN('admin','editor') AND source='manual' AND created_by=auth.uid() AND source_keys='[]'::jsonb);

CREATE OR REPLACE FUNCTION feedback_private.log_audit_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RETURN NEW; END IF;
 INSERT INTO public.audit_activity_log(actor_email,action,entity,entity_id,details)
 VALUES(coalesce(auth.jwt()->>'email','system'),TG_OP,TG_TABLE_NAME,NEW.id::text,jsonb_build_object('after',to_jsonb(NEW)));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION feedback_private.log_audit_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER audit_inspection_log AFTER INSERT ON public.audit_inspections FOR EACH ROW EXECUTE FUNCTION feedback_private.log_audit_change();
CREATE TRIGGER audit_type_log AFTER INSERT OR UPDATE ON public.audit_error_types FOR EACH ROW EXECUTE FUNCTION feedback_private.log_audit_change();
CREATE TRIGGER audit_hygiene_log AFTER INSERT OR UPDATE ON public.audit_hygiene FOR EACH ROW EXECUTE FUNCTION feedback_private.log_audit_change();

CREATE OR REPLACE FUNCTION public.audit_save_inspection(p_store text,p_occurred_at timestamptz,p_note text,p_issues jsonb) RETURNS uuid
 LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_id uuid; v_issue jsonb;
BEGIN
 IF auth.uid() IS NULL OR feedback_private.module_role('audit') NOT IN('admin','editor') THEN RAISE EXCEPTION 'Không có quyền nhập Audit'; END IF;
 IF jsonb_typeof(p_issues)<>'array' OR jsonb_array_length(p_issues)>100 THEN RAISE EXCEPTION 'Danh sách lỗi không hợp lệ'; END IF;
 IF p_occurred_at>now()+interval '5 minutes' THEN RAISE EXCEPTION 'Không nhập lượt kiểm tra trong tương lai'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.audit_stores WHERE id=p_store AND active) THEN RAISE EXCEPTION 'Cửa hàng không hoạt động'; END IF;
 INSERT INTO public.audit_inspections(store_id,occurred_at,audit_date,note) VALUES(p_store,p_occurred_at,(p_occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,coalesce(p_note,'')) RETURNING id INTO v_id;
 FOR v_issue IN SELECT value FROM jsonb_array_elements(p_issues) LOOP
 IF NOT EXISTS(SELECT 1 FROM public.audit_error_types WHERE id=(v_issue->>'error_type_id')::uuid AND active) THEN RAISE EXCEPTION 'Loại lỗi đã ngừng sử dụng'; END IF;
 INSERT INTO public.audit_violations(inspection_id,error_type_id,description) VALUES(v_id,(v_issue->>'error_type_id')::uuid,coalesce(v_issue->>'description',''));
 END LOOP;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.audit_save_inspection(text,timestamptz,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.audit_save_inspection(text,timestamptz,text,jsonb) TO authenticated;

-- Protect Feedback-owned data. Shared allowed_emails/stores policies are not changed.
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_feedbacks ON public.feedbacks;
CREATE POLICY feedback_read ON public.feedbacks FOR SELECT TO authenticated USING((SELECT feedback_private.module_role('feedback')) IS NOT NULL);
CREATE POLICY feedback_insert ON public.feedbacks FOR INSERT TO authenticated WITH CHECK((SELECT feedback_private.module_role('feedback'))='admin');
CREATE POLICY feedback_update ON public.feedbacks FOR UPDATE TO authenticated USING((SELECT feedback_private.module_role('feedback'))='admin') WITH CHECK((SELECT feedback_private.module_role('feedback'))='admin');
CREATE POLICY feedback_delete ON public.feedbacks FOR DELETE TO authenticated USING((SELECT feedback_private.module_role('feedback'))='admin');
ALTER TABLE public.audit_log_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_write_audit ON public.audit_log_feedback;
CREATE POLICY feedback_log_read ON public.audit_log_feedback FOR SELECT TO authenticated USING((SELECT feedback_private.module_role('feedback'))='admin');
CREATE POLICY feedback_log_insert ON public.audit_log_feedback FOR INSERT TO authenticated WITH CHECK((SELECT feedback_private.module_role('feedback'))='admin' AND user_email=lower(auth.jwt()->>'email'));

CREATE TABLE public.app_backup_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),status text NOT NULL CHECK(status IN('running','completed','failed')),
 started_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz,triggered_by text,
 counts jsonb NOT NULL DEFAULT '{}',checksum text,sheet_url text,archive_url text,error text
);
ALTER TABLE public.app_backup_runs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.app_backup_runs TO authenticated;
REVOKE ALL ON public.app_backup_runs FROM anon;
CREATE POLICY backup_read ON public.app_backup_runs FOR SELECT TO authenticated USING((SELECT feedback_private.is_owner()));
CREATE TABLE feedback_private.backup_config (id boolean PRIMARY KEY DEFAULT true CHECK(id),token_sha256 text NOT NULL,active_run uuid,locked_until timestamptz);
REVOKE ALL ON feedback_private.backup_config FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION feedback_private.assert_backup_token(p_token text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF length(coalesce(p_token,''))<40 OR NOT EXISTS(SELECT 1 FROM feedback_private.backup_config WHERE token_sha256=encode(sha256(convert_to(p_token,'UTF8')),'hex')) THEN RAISE EXCEPTION 'Unauthorized backup'; END IF;
END $$;
REVOKE ALL ON FUNCTION feedback_private.assert_backup_token(text) FROM PUBLIC,anon,authenticated;

-- The public facade is deliberately token-gated; no SQL or table names accepted from callers.
CREATE OR REPLACE FUNCTION public.feedback_backup_snapshot(p_token text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_data jsonb := '{}';v_table text;v_rows jsonb;
BEGIN
 PERFORM feedback_private.assert_backup_token(p_token);
 FOREACH v_table IN ARRAY ARRAY['feedbacks','stores','allowed_emails','audit_log_feedback','feedback_app_members','feedback_module_access','audit_stores','audit_error_types','audit_inspections','audit_violations','audit_hygiene','audit_activity_log','audit_import_batches','audit_import_cells','app_backup_runs'] LOOP
 EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),''[]''::jsonb) FROM public.%I t',v_table) INTO v_rows;
 v_data:=v_data||jsonb_build_object(v_table,v_rows);
 END LOOP;
 RETURN jsonb_build_object('format_version',2,'snapshot_at',transaction_timestamp(),'project_ref','stxymyjwxdtfxkvmsgmz','tables',v_data,
 'columns',(SELECT jsonb_agg(to_jsonb(c) ORDER BY table_name,ordinal_position) FROM information_schema.columns c WHERE table_schema='public' AND v_data ? table_name),
 'constraints',(SELECT jsonb_agg(jsonb_build_object('table',r.relname,'name',c.conname,'definition',pg_get_constraintdef(c.oid))) FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' AND v_data ? r.relname));
END $$;
CREATE OR REPLACE FUNCTION public.feedback_backup_begin(p_token text,p_actor text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid:=gen_random_uuid();
BEGIN
 PERFORM feedback_private.assert_backup_token(p_token);
 UPDATE feedback_private.backup_config SET active_run=v_id,locked_until=now()+interval '10 minutes' WHERE id AND (locked_until IS NULL OR locked_until<now());
 IF NOT FOUND THEN RAISE EXCEPTION 'Một lượt backup khác đang chạy'; END IF;
 INSERT INTO public.app_backup_runs(id,status,triggered_by) VALUES(v_id,'running',p_actor);
 RETURN v_id;
END $$;
CREATE OR REPLACE FUNCTION public.feedback_backup_log(p_token text,p_run jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 PERFORM feedback_private.assert_backup_token(p_token);
 INSERT INTO public.app_backup_runs(id,status,triggered_by,counts,checksum,sheet_url,archive_url,error,completed_at)
 VALUES(coalesce((p_run->>'id')::uuid,gen_random_uuid()),p_run->>'status',p_run->>'triggered_by',coalesce(p_run->'counts','{}'),p_run->>'checksum',p_run->>'sheet_url',p_run->>'archive_url',p_run->>'error',CASE WHEN p_run->>'status'<>'running' THEN now() END)
 ON CONFLICT(id) DO UPDATE SET status=excluded.status,counts=excluded.counts,checksum=excluded.checksum,sheet_url=excluded.sheet_url,archive_url=excluded.archive_url,error=excluded.error,completed_at=excluded.completed_at RETURNING id INTO v_id;
 IF p_run->>'status' IN ('completed','failed') THEN UPDATE feedback_private.backup_config SET active_run=NULL,locked_until=NULL WHERE active_run=v_id; END IF;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.feedback_backup_snapshot(text),public.feedback_backup_log(text,jsonb),public.feedback_backup_begin(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.feedback_backup_snapshot(text),public.feedback_backup_log(text,jsonb),public.feedback_backup_begin(text,text) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.feedback_restore_snapshot(p_token text,p_snapshot jsonb,p_actor text) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t text;rows jsonb;cols text;updates text;pk text;restored bigint:=0;n bigint;
BEGIN
 PERFORM feedback_private.assert_backup_token(p_token);
 IF p_snapshot->>'project_ref'<>'stxymyjwxdtfxkvmsgmz' OR (p_snapshot->>'format_version')::int NOT IN(1,2) OR jsonb_typeof(p_snapshot->'tables'->'feedbacks')<>'array' THEN RAISE EXCEPTION 'Invalid restore snapshot'; END IF;
 -- Shared stores/allowed_emails and access rights are deliberately not overwritten.
 FOREACH t IN ARRAY ARRAY['audit_stores','audit_error_types','audit_import_batches','audit_inspections','audit_violations','audit_hygiene','audit_import_cells','feedbacks','audit_log_feedback','audit_activity_log'] LOOP
 rows:=p_snapshot->'tables'->t;
 IF rows IS NULL THEN CONTINUE; END IF;
 IF jsonb_typeof(rows)<>'array' OR jsonb_array_length(rows)>1000000 THEN RAISE EXCEPTION 'Invalid table payload'; END IF;
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
END $$;
REVOKE ALL ON FUNCTION public.feedback_restore_snapshot(text,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.feedback_restore_snapshot(text,jsonb,text) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
