-- No business fixtures survive this test.
BEGIN;
CREATE TEMP TABLE bulk_fixture AS SELECT
 (SELECT id FROM public.audit_stores WHERE active ORDER BY id LIMIT 1) store,
 (SELECT id FROM public.audit_stores WHERE active ORDER BY id OFFSET 1 LIMIT 1) store2,
 (SELECT id FROM public.audit_error_types WHERE active ORDER BY id LIMIT 1) category,
 (SELECT u.id FROM auth.users u JOIN public.feedback_module_access a ON lower(u.email)=a.email WHERE a.module='audit' AND a.role='admin' LIMIT 1) actor,
 (SELECT u.email FROM auth.users u JOIN public.feedback_module_access a ON lower(u.email)=a.email WHERE a.module='audit' AND a.role='admin' LIMIT 1) email,
 (SELECT audit_date FROM generate_series('1998-01-01'::date,'1998-12-31'::date,'1 day') d(audit_date) WHERE NOT EXISTS(SELECT 1 FROM public.audit_hygiene h WHERE h.audit_date=d.audit_date) LIMIT 1) test_day;
GRANT SELECT ON bulk_fixture TO authenticated;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',actor,'email',email,'role','authenticated')::text,true) FROM bulk_fixture;
SET LOCAL ROLE authenticated;
DO $$
DECLARE f record;req uuid:=gen_random_uuid(); payload jsonb;result jsonb;again jsonb;before_n bigint;rejected boolean;h public.audit_hygiene%ROWTYPE;
BEGIN
 SELECT * INTO f FROM bulk_fixture;
 payload:=jsonb_build_array(
  jsonb_build_object('store_id',f.store,'occurred_at',now()-interval '1 hour','clear',false,'issues',jsonb_build_array(jsonb_build_object('error_type_id',f.category,'description','rollback bulk issue'))),
  jsonb_build_object('store_id',f.store2,'occurred_at',now()-interval '1 hour','clear',true,'issues','[]'::jsonb));
 SELECT count(*) INTO before_n FROM public.audit_inspections;
 result:=public.audit_save_bulk(req,'inspection',payload);
 again:=public.audit_save_bulk(req,'inspection',payload);
 IF result<>again OR (result->>'saved')::int<>2 OR (SELECT count(*) FROM public.audit_inspections)<>before_n+2 THEN RAISE EXCEPTION 'Audit retry duplicated records'; END IF;
 IF (SELECT count(*) FROM public.audit_activity_log WHERE entity='audit_inspections' AND entity_id IN(SELECT jsonb_array_elements_text(result->'ids')))<>2 THEN RAISE EXCEPTION 'Missing per-visit logs'; END IF;
 IF (SELECT count(*) FROM public.audit_violations WHERE inspection_id=(result->'ids'->>0)::uuid OR inspection_id=(result->'ids'->>1)::uuid)<>1 THEN RAISE EXCEPTION 'Wrong issue count'; END IF;
 rejected:=false;BEGIN PERFORM public.audit_save_bulk(req,'inspection',payload||payload);EXCEPTION WHEN OTHERS THEN rejected:=true;END;
 IF NOT rejected THEN RAISE EXCEPTION 'Changed retry payload accepted'; END IF;
 SELECT count(*) INTO before_n FROM public.audit_inspections;
 rejected:=false;BEGIN
 PERFORM public.audit_save_bulk(gen_random_uuid(),'inspection',jsonb_build_array(payload->0,jsonb_build_object('store_id',f.store2,'occurred_at',now(),'clear',false,'issues',jsonb_build_array(jsonb_build_object('error_type_id',gen_random_uuid())))));
 EXCEPTION WHEN OTHERS THEN rejected:=true;END;
 IF NOT rejected OR (SELECT count(*) FROM public.audit_inspections)<>before_n THEN RAISE EXCEPTION 'Partial batch survived error'; END IF;
 rejected:=false;BEGIN PERFORM public.audit_save_bulk(gen_random_uuid(),'inspection',jsonb_build_array(jsonb_build_object('store_id',f.store,'occurred_at',now(),'clear',false,'issues','[]'::jsonb)));EXCEPTION WHEN OTHERS THEN rejected:=true;END;
 IF NOT rejected THEN RAISE EXCEPTION 'Blank visit silently counted clean'; END IF;
 payload:=jsonb_build_array(
 jsonb_build_object('store_id',f.store,'audit_date',f.test_day,'shift',1,'status','pass'),
 jsonb_build_object('store_id',f.store,'audit_date',f.test_day,'shift',2,'status','fail'),
 jsonb_build_object('store_id',f.store2,'audit_date',f.test_day,'shift',1,'status','pending'));
 req:=gen_random_uuid();result:=public.audit_save_bulk(req,'hygiene',payload);again:=public.audit_save_bulk(req,'hygiene',payload);
 IF result<>again OR (result->>'saved')::int<>3 THEN RAISE EXCEPTION 'Hygiene batch/retry failed'; END IF;
 SELECT * INTO h FROM public.audit_hygiene WHERE store_id=f.store AND audit_date=f.test_day AND shift=1;
 rejected:=false;BEGIN PERFORM public.audit_save_bulk(gen_random_uuid(),'hygiene',payload);EXCEPTION WHEN OTHERS THEN rejected:=true;END;
 IF NOT rejected THEN RAISE EXCEPTION 'Existing result overwritten without approval'; END IF;
 result:=public.audit_save_bulk(gen_random_uuid(),'hygiene',jsonb_build_array(jsonb_build_object('store_id',f.store,'audit_date',f.test_day,'shift',1,'status','fail','expected_updated_at',h.updated_at)));
 IF NOT EXISTS(SELECT 1 FROM public.audit_hygiene WHERE id=h.id AND status='fail') THEN RAISE EXCEPTION 'Explicit update failed'; END IF;
 rejected:=false;BEGIN PERFORM public.audit_save_bulk(gen_random_uuid(),'hygiene',jsonb_build_array(jsonb_build_object('store_id',f.store,'audit_date',f.test_day,'shift',1,'status','pass','expected_updated_at',h.updated_at)));EXCEPTION WHEN OTHERS THEN rejected:=true;END;
 IF NOT rejected THEN RAISE EXCEPTION 'Stale update accepted'; END IF;
END $$;
RESET ROLE;
-- Check editor succeeds, viewer/outsider/null-module/anonymous fail; grants alone are insufficient.
DO $$
DECLARE a record; rejected boolean;r jsonb; f record;
BEGIN
 SELECT * INTO f FROM bulk_fixture;
 FOR a IN SELECT u.id,u.email,m.role FROM auth.users u LEFT JOIN public.feedback_module_access m ON m.email=lower(u.email) AND m.module='audit' WHERE m.role IN('editor','viewer') OR m.role IS NULL LOOP
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',a.id,'email',a.email,'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  rejected:=false;BEGIN r:=public.audit_save_bulk(gen_random_uuid(),'inspection',jsonb_build_array(jsonb_build_object('store_id',f.store,'occurred_at',now()-interval '1 hour','clear',true,'issues','[]'::jsonb)));EXCEPTION WHEN OTHERS THEN rejected:=true;END;
  RESET ROLE;
  IF (a.role='editor' AND rejected) OR (a.role IS DISTINCT FROM 'editor' AND NOT rejected) THEN RAISE EXCEPTION 'Wrong permission for role %',coalesce(a.role,'none');END IF;
 END LOOP;
 PERFORM set_config('request.jwt.claims','{}',true);
 SET LOCAL ROLE anon;
 rejected:=false;BEGIN PERFORM public.audit_save_bulk(gen_random_uuid(),'inspection','[]'::jsonb);EXCEPTION WHEN insufficient_privilege THEN rejected:=true;END;
 RESET ROLE;
 IF NOT rejected THEN RAISE EXCEPTION 'Anonymous execute allowed';END IF;
END $$;
ROLLBACK;
SELECT 'Bulk: atomic rollback, retries, conflicts, explicit clean checks, logs and roles passed; fixtures rolled back' AS result;
