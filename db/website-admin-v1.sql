-- Public website catalog is independent of stores.active and all reporting tables.
BEGIN;
ALTER TABLE public.feedback_module_access DROP CONSTRAINT feedback_module_access_module_check;
ALTER TABLE public.feedback_module_access ADD CONSTRAINT feedback_module_access_module_check CHECK(module IN ('feedback','audit','website'));
INSERT INTO public.feedback_module_access(email,module,role) VALUES ('dangnhan.mrt@gmail.com','website','admin') ON CONFLICT DO NOTHING;

CREATE TABLE public.website_store_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 internal_store_id text UNIQUE REFERENCES public.stores(id),
 data jsonb NOT NULL,
 version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.website_menus (
 id text PRIMARY KEY CHECK(id IN ('central','other')),
 images jsonb NOT NULL CHECK(jsonb_typeof(images)='array' AND jsonb_array_length(images) BETWEEN 1 AND 8),
 version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.website_activity (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_email text NOT NULL, entity text NOT NULL, entity_id text NOT NULL,
 action text NOT NULL, before_data jsonb, after_data jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX website_activity_recent ON public.website_activity(created_at DESC,id DESC);
CREATE UNIQUE INDEX website_store_maps_unique ON public.website_store_profiles ((data->>'maps_url'));

CREATE FUNCTION feedback_private.validate_website_store(d jsonb) RETURNS boolean
 LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE a jsonb;
BEGIN
 IF jsonb_typeof(d)<>'object' OR NOT d ?& ARRAY['name','region','address','maps_url','plus_code','lat','lng','delivery','pickup','phone','apps','menu_group','visible'] THEN RETURN false; END IF;
 IF EXISTS (SELECT 1 FROM jsonb_object_keys(d) k WHERE k NOT IN ('name','region','address','maps_url','plus_code','lat','lng','delivery','pickup','phone','apps','menu_group','visible')) THEN RETURN false; END IF;
 IF EXISTS (SELECT 1 FROM unnest(ARRAY['name','region','address','maps_url','plus_code','phone','menu_group']) k WHERE jsonb_typeof(d->k)<>'string') THEN RETURN false; END IF;
 IF length(trim(d->>'name')) NOT BETWEEN 1 AND 120 OR length(trim(d->>'region')) NOT BETWEEN 1 AND 80 OR length(trim(d->>'address')) NOT BETWEEN 1 AND 500 THEN RETURN false; END IF;
 IF (d->>'maps_url') !~ '^https://(maps\.app\.goo\.gl/|(www\.)?google\.com/maps/|goo\.gl/maps/)' OR length(d->>'maps_url')>2000 THEN RETURN false; END IF;
 IF d->>'menu_group' NOT IN ('central','other') OR length(d->>'plus_code')>200 OR length(d->>'phone')>32 THEN RETURN false; END IF;
 IF (d->>'phone')<>'' AND regexp_replace(d->>'phone','[^0-9]','','g') !~ '^[0-9]{9,15}$' THEN RETURN false; END IF;
 IF EXISTS (SELECT 1 FROM unnest(ARRAY['delivery','pickup','visible']) k WHERE jsonb_typeof(d->k)<>'boolean') THEN RETURN false; END IF;
 IF jsonb_typeof(d->'lat')<>'number' OR jsonb_typeof(d->'lng')<>'number' THEN RETURN false; END IF;
 IF (d->>'lat')::numeric NOT BETWEEN 8 AND 24 OR (d->>'lng')::numeric NOT BETWEEN 100 AND 115 THEN RETURN false; END IF;
 IF jsonb_typeof(d->'apps')<>'array' OR jsonb_array_length(d->'apps')>12 THEN RETURN false; END IF;
 FOR a IN SELECT value FROM jsonb_array_elements(d->'apps') LOOP
  IF jsonb_typeof(a)<>'object' OR jsonb_typeof(a->'name') IS DISTINCT FROM 'string' OR jsonb_typeof(a->'note') IS DISTINCT FROM 'string' OR length(trim(a->>'name')) NOT BETWEEN 1 AND 60 OR length(a->>'note')>300 THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION feedback_private.validate_website_store(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION feedback_private.validate_website_store(jsonb) TO authenticated;
ALTER TABLE public.website_store_profiles ADD CONSTRAINT website_profile_valid CHECK(feedback_private.validate_website_store(data));

ALTER TABLE public.website_store_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_activity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.website_store_profiles,public.website_menus,public.website_activity FROM anon,authenticated;
GRANT SELECT(id,data,version,updated_at) ON public.website_store_profiles TO anon;
GRANT SELECT ON public.website_menus TO anon;
GRANT SELECT,INSERT,UPDATE ON public.website_store_profiles,public.website_menus TO authenticated;
GRANT SELECT ON public.website_activity TO authenticated;
CREATE POLICY website_store_public_read ON public.website_store_profiles FOR SELECT TO anon USING ((data->>'visible')::boolean);
CREATE POLICY website_store_member_read ON public.website_store_profiles FOR SELECT TO authenticated USING ((SELECT feedback_private.module_role('website')) IS NOT NULL);
CREATE POLICY website_store_insert ON public.website_store_profiles FOR INSERT TO authenticated WITH CHECK ((SELECT feedback_private.module_role('website')) IN ('admin','editor'));
CREATE POLICY website_store_update ON public.website_store_profiles FOR UPDATE TO authenticated USING ((SELECT feedback_private.module_role('website')) IN ('admin','editor')) WITH CHECK ((SELECT feedback_private.module_role('website')) IN ('admin','editor'));
CREATE POLICY website_menu_read ON public.website_menus FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY website_menu_update ON public.website_menus FOR UPDATE TO authenticated USING ((SELECT feedback_private.module_role('website')) IN ('admin','editor')) WITH CHECK ((SELECT feedback_private.module_role('website')) IN ('admin','editor'));
CREATE POLICY website_activity_read ON public.website_activity FOR SELECT TO authenticated USING ((SELECT feedback_private.module_role('website')) IS NOT NULL);

-- Only the trigger can write the activity journal; clients cannot forge actor/version.
CREATE FUNCTION feedback_private.website_stamp() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a text := coalesce(lower(auth.jwt()->>'email'),'catalog_import');
BEGIN
 IF TG_OP='UPDATE' THEN NEW.version:=OLD.version+1; ELSE NEW.version:=1; END IF;
 NEW.updated_at:=clock_timestamp();
 IF TG_TABLE_NAME='website_menus' AND EXISTS (
   SELECT 1 FROM jsonb_array_elements(NEW.images) i WHERE
   jsonb_typeof(i->'src') IS DISTINCT FROM 'string' OR (i->>'src') !~ '^https://' OR
   jsonb_typeof(i->'alt') IS DISTINCT FROM 'string' OR jsonb_typeof(i->'width') IS DISTINCT FROM 'number' OR
   jsonb_typeof(i->'height') IS DISTINCT FROM 'number' OR (i->>'width')::numeric<=0 OR (i->>'height')::numeric<=0
 ) THEN RAISE EXCEPTION 'Ảnh menu không hợp lệ'; END IF;
 INSERT INTO public.website_activity(actor_email,entity,entity_id,action,before_data,after_data)
 VALUES(a,TG_TABLE_NAME,NEW.id::text,CASE WHEN TG_OP='INSERT' THEN 'create' ELSE 'update' END,
 CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION feedback_private.website_stamp() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER website_store_stamp BEFORE INSERT OR UPDATE ON public.website_store_profiles FOR EACH ROW EXECUTE FUNCTION feedback_private.website_stamp();
CREATE TRIGGER website_menu_stamp BEFORE INSERT OR UPDATE ON public.website_menus FOR EACH ROW EXECUTE FUNCTION feedback_private.website_stamp();

CREATE FUNCTION feedback_private.website_access_log() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF coalesce(NEW.module,OLD.module)='website' THEN
 INSERT INTO public.website_activity(actor_email,entity,entity_id,action,before_data,after_data)
 VALUES(coalesce(lower(auth.jwt()->>'email'),'catalog_import'),'access',coalesce(NEW.email,OLD.email),'access',CASE WHEN TG_OP<>'INSERT' THEN to_jsonb(OLD) END,CASE WHEN TG_OP<>'DELETE' THEN to_jsonb(NEW) END);
 END IF;
 RETURN coalesce(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION feedback_private.website_access_log() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER website_access_log AFTER INSERT OR UPDATE OR DELETE ON public.feedback_module_access FOR EACH ROW EXECUTE FUNCTION feedback_private.website_access_log();

-- Public facade obeys row policies and returns public fields only.
CREATE FUNCTION public.website_public_catalog() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('stores',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'data',data,'version',version) ORDER BY data->>'name') FROM public.website_store_profiles WHERE (data->>'visible')::boolean),'[]'::jsonb),
 'menus',coalesce((SELECT jsonb_object_agg(id,jsonb_build_object('images',images,'version',version)) FROM public.website_menus),'{}'::jsonb))
$$;
REVOKE ALL ON FUNCTION public.website_public_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.website_public_catalog() TO anon,authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES ('website-menus','website-menus',true,12582912,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT DO NOTHING;
CREATE POLICY website_menu_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='website-menus' AND (SELECT feedback_private.module_role('website')) IN ('admin','editor'));
-- Immutable versioned uploads: no overwrite or delete permission is granted.
COMMIT;
