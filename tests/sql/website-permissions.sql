-- All fixtures and writes are rolled back. No persistent test stores/accounts.
BEGIN ISOLATION LEVEL REPEATABLE READ;
CREATE TEMP TABLE website_test_baseline ON COMMIT DROP AS SELECT
 (SELECT count(*) FROM public.website_store_profiles) AS total,
 (SELECT count(*) FROM public.website_store_profiles WHERE (data->>'visible')::boolean) AS published,
 (SELECT count(*) FROM public.feedbacks) AS feedback_count,
 (SELECT count(*) FROM public.audit_inspections) AS audit_count,
 (SELECT md5(jsonb_agg(to_jsonb(s) ORDER BY s.id)::text) FROM public.stores s) AS internal_stores_hash;
GRANT SELECT(total,published) ON website_test_baseline TO anon,authenticated;
INSERT INTO public.feedback_app_members(email) VALUES ('website-test-editor@example.invalid'),('website-test-viewer@example.invalid');
INSERT INTO public.feedback_module_access(email,module,role) VALUES ('website-test-editor@example.invalid','website','editor'),('website-test-viewer@example.invalid','website','viewer');
SET LOCAL ROLE anon;
DO $$ DECLARE c jsonb; BEGIN
 c:=public.website_public_catalog();
 ASSERT jsonb_array_length(c->'stores')=(SELECT published FROM website_test_baseline),'Public catalog lost stores';
 ASSERT NOT EXISTS(SELECT 1 FROM jsonb_array_elements(c->'stores') s WHERE NOT (s->'data'->>'visible')::boolean),'Hidden store leaked';
 BEGIN PERFORM internal_store_id FROM public.website_store_profiles; RAISE EXCEPTION 'Private internal ID readable'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM * FROM public.website_activity; RAISE EXCEPTION 'Anonymous activity readable'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.website_menus(id,images) VALUES ('other','[]'); RAISE EXCEPTION 'Anonymous wrote menu'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","email":"website-test-viewer@example.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE r public.website_store_profiles; BEGIN
 ASSERT (SELECT count(*) FROM public.website_store_profiles)=(SELECT total FROM website_test_baseline),'Viewer cannot see hidden records';
 SELECT * INTO r FROM public.website_store_profiles LIMIT 1;
 UPDATE public.website_store_profiles SET data=jsonb_set(data,'{name}','"Unauthorized"') WHERE id=r.id;
 ASSERT NOT FOUND,'Viewer could update a store';
 BEGIN INSERT INTO public.website_store_profiles(data) VALUES(r.data); RAISE EXCEPTION 'Viewer could insert'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","email":"website-test-editor@example.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE r public.website_store_profiles; v integer; new_id uuid; BEGIN
 SELECT * INTO r FROM public.website_store_profiles LIMIT 1;
 UPDATE public.website_store_profiles SET data=jsonb_set(data,'{visible}',to_jsonb(NOT (data->>'visible')::boolean)),version=999 WHERE id=r.id AND version=r.version;
 SELECT version INTO v FROM public.website_store_profiles WHERE id=r.id;
 ASSERT v=r.version+1,'Version is not authoritative';
 ASSERT EXISTS(SELECT 1 FROM public.website_activity WHERE entity_id=r.id::text AND actor_email='website-test-editor@example.invalid' AND before_data->'data'->'visible' IS DISTINCT FROM after_data->'data'->'visible'),'Atomic journal missing';
 UPDATE public.website_store_profiles SET data=r.data WHERE id=r.id AND version=r.version;
 ASSERT NOT FOUND,'Stale update overwrote another edit';
 BEGIN UPDATE public.website_store_profiles SET data=jsonb_set(data,'{maps_url}','"javascript:alert(1)"') WHERE id=r.id; RAISE EXCEPTION 'Unsafe link accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN DELETE FROM public.website_store_profiles WHERE id=r.id; RAISE EXCEPTION 'Editor could delete'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.feedback_module_access SET role='admin' WHERE email='website-test-editor@example.invalid' AND module='website'; ASSERT NOT FOUND,'Editor elevated own role'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 ASSERT EXISTS(SELECT 1 FROM public.website_store_profiles WHERE id=r.id),'Store lost';
 INSERT INTO public.website_store_profiles(data) VALUES(jsonb_set(r.data,'{maps_url}',to_jsonb('https://maps.app.goo.gl/test-'||gen_random_uuid()::text))) RETURNING id INTO new_id;
 ASSERT EXISTS(SELECT 1 FROM public.website_store_profiles WHERE id=new_id AND display_order>0 AND version=1),'Editor cannot create a profile';
 UPDATE public.website_menus SET images=images WHERE id='central';
 ASSERT FOUND,'Editor cannot update menu';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003","email":"no-website-access@example.invalid","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 ASSERT (SELECT count(*) FROM public.website_store_profiles)=0,'Unrelated account can read admin catalog';
 ASSERT (SELECT count(*) FROM public.website_activity)=0,'Unrelated account reads history';
END $$;
RESET ROLE;
DO $$ BEGIN
 ASSERT (SELECT feedback_count FROM website_test_baseline)=(SELECT count(*) FROM public.feedbacks),'Feedback changed';
 ASSERT (SELECT audit_count FROM website_test_baseline)=(SELECT count(*) FROM public.audit_inspections),'Audit changed';
 ASSERT (SELECT internal_stores_hash FROM website_test_baseline)=(SELECT md5(jsonb_agg(to_jsonb(s) ORDER BY s.id)::text) FROM public.stores s),'Internal store state changed';
END $$;
ROLLBACK;
SELECT jsonb_build_object('permission_tests','passed','stores',(SELECT count(*) FROM public.website_store_profiles),'published',(SELECT count(*) FROM public.website_store_profiles WHERE (data->>'visible')::boolean),'feedbacks',(SELECT count(*) FROM public.feedbacks),'audit',(SELECT count(*) FROM public.audit_inspections)) as result;
