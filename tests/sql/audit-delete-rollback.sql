-- Execute against the configured database. All fixtures and changes roll back.
BEGIN;
CREATE TEMP TABLE audit_delete_fixture AS SELECT
 gen_random_uuid() i1,gen_random_uuid() i2,gen_random_uuid() i3,
 gen_random_uuid() v1,gen_random_uuid() v2,gen_random_uuid() v3,
 (SELECT id FROM public.audit_stores WHERE active ORDER BY id LIMIT 1) store,
 (SELECT id FROM public.audit_error_types WHERE active ORDER BY id LIMIT 1) category,
 (SELECT id FROM auth.users WHERE email='dangnhan.mrt@gmail.com') owner_id,
 (SELECT array_agg(email) FROM public.feedback_module_access WHERE module='audit' AND role IN('editor','viewer')) non_admin_emails;
GRANT SELECT ON audit_delete_fixture TO authenticated;
INSERT INTO public.audit_inspections(id,store_id,occurred_at,audit_date,note)
 SELECT x,f.store,now(),(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,'rollback-only deletion test'
 FROM audit_delete_fixture f CROSS JOIN LATERAL (VALUES(f.i1),(f.i2),(f.i3)) t(x);
INSERT INTO public.audit_violations(id,inspection_id,error_type_id,description)
 SELECT v,i,f.category,'rollback-only test issue' FROM audit_delete_fixture f
 CROSS JOIN LATERAL (VALUES(f.v1,f.i1),(f.v2,f.i1),(f.v3,f.i2)) t(v,i);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'email','dangnhan.mrt@gmail.com','role','authenticated')::text,true) FROM audit_delete_fixture;
SET LOCAL ROLE authenticated;
DO $$
DECLARE f record;r jsonb;rejected boolean;email text;
BEGIN
 SELECT * INTO f FROM audit_delete_fixture;
 r:=public.audit_remove_entry(f.i1,f.v1,'Nhập nhầm một lỗi',2);
 IF (r->>'inspection_removed')::boolean OR NOT EXISTS(SELECT 1 FROM public.audit_inspections WHERE id=f.i1 AND deleted_at IS NULL)
 OR NOT EXISTS(SELECT 1 FROM public.audit_violations WHERE id=f.v1 AND deleted_at IS NOT NULL)
 OR NOT EXISTS(SELECT 1 FROM public.audit_violations WHERE id=f.v2 AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Partial removal failed';END IF;
 rejected:=false;BEGIN PERFORM public.audit_remove_entry(f.i1,f.v2,'Stale view',2);EXCEPTION WHEN raise_exception THEN rejected:=true;END;
 IF NOT rejected THEN RAISE EXCEPTION 'Stale count was accepted';END IF;
 rejected:=false;BEGIN PERFORM public.audit_remove_entry(f.i1,f.v3,'Wrong parent',1);EXCEPTION WHEN raise_exception THEN rejected:=true;END;
 IF NOT rejected THEN RAISE EXCEPTION 'Cross-inspection issue was accepted';END IF;
 r:=public.audit_remove_entry(f.i1,f.v2,'  ',1);
 IF NOT (r->>'inspection_removed')::boolean OR NOT EXISTS(SELECT 1 FROM public.audit_inspections WHERE id=f.i1 AND deleted_at IS NOT NULL) THEN RAISE EXCEPTION 'Last issue became clean visit';END IF;
 r:=public.audit_remove_entry(f.i2,NULL,NULL,1);
 IF NOT (r->>'inspection_removed')::boolean OR NOT EXISTS(SELECT 1 FROM public.audit_violations WHERE id=f.v3 AND deleted_at IS NOT NULL) THEN RAISE EXCEPTION 'Whole visit removal failed';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.audit_inspections WHERE id=f.i3 AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Other clean visit changed';END IF;
 IF (SELECT count(*) FROM public.audit_activity_log WHERE entity_id IN(f.v1::text,f.v2::text,f.i2::text) AND action IN('REMOVE_INSPECTION','REMOVE_VIOLATION'))<>3 THEN RAISE EXCEPTION 'Audit log missing';END IF;
 IF EXISTS(SELECT 1 FROM public.audit_activity_log WHERE entity_id IN(f.v2::text,f.i2::text) AND details->>'reason' IS NOT NULL) THEN RAISE EXCEPTION 'Empty reason was not normalized';END IF;
 FOREACH email IN ARRAY f.non_admin_emails || ARRAY['unlisted@example.invalid'] LOOP
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',f.owner_id,'email',email,'role','authenticated')::text,true);
  rejected:=false;BEGIN PERFORM public.audit_remove_entry(f.i3,NULL,'Not permitted',0);EXCEPTION WHEN insufficient_privilege THEN rejected:=true;END;
  IF NOT rejected THEN RAISE EXCEPTION 'Non-admin could remove data';END IF;
 END LOOP;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',f.owner_id,'email','dangnhan.mrt@gmail.com','role','authenticated')::text,true);
 rejected:=false;BEGIN UPDATE public.audit_inspections SET deleted_at=now() WHERE id=f.i3;EXCEPTION WHEN insufficient_privilege THEN rejected:=true;END;
 IF NOT rejected THEN RAISE EXCEPTION 'Direct table update could bypass RPC';END IF;
 IF has_function_privilege('anon','public.audit_remove_entry(uuid,uuid,text,integer)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous RPC execute is allowed';END IF;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'Passed: partial removal, last issue, whole visit, log, blank/null reasons accepted; stale/cross-parent rejection, editor/viewer/outsider/anonymous denial, no direct UPDATE; all fixtures rolled back' AS verification;
