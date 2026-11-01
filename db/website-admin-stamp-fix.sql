CREATE OR REPLACE FUNCTION feedback_private.website_stamp() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a text := coalesce(lower(auth.jwt()->>'email'),'catalog_import');
BEGIN
 IF TG_OP='UPDATE' THEN NEW.version:=OLD.version+1; ELSE NEW.version:=1; END IF;
 NEW.updated_at:=clock_timestamp();
 IF TG_TABLE_NAME='website_menus' AND EXISTS (
   SELECT 1 FROM jsonb_array_elements(to_jsonb(NEW)->'images') i WHERE
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
