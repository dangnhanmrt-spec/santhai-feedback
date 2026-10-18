CREATE OR REPLACE FUNCTION feedback_private.sync_audit_store() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.audit_stores(id,name,region_id,active,current_store_id,historical_only) VALUES(NEW.id,NEW.name,NEW.region_id,coalesce(NEW.active,true),NEW.id,false)
 ON CONFLICT(id) DO UPDATE SET name=excluded.name,region_id=excluded.region_id,active=excluded.active;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION feedback_private.sync_audit_store() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sync_feedback_audit_stores AFTER INSERT OR UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION feedback_private.sync_audit_store();
