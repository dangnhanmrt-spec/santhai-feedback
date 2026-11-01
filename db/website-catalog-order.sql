-- Preserve catalog insertion order on the public website; newly added stores follow it.
ALTER TABLE public.website_store_profiles ADD COLUMN display_order bigint GENERATED ALWAYS AS IDENTITY;
GRANT SELECT(display_order) ON public.website_store_profiles TO anon;
CREATE OR REPLACE FUNCTION public.website_public_catalog() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('stores',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'data',data,'version',version) ORDER BY display_order,id) FROM public.website_store_profiles WHERE (data->>'visible')::boolean),'[]'::jsonb),
 'menus',coalesce((SELECT jsonb_object_agg(id,jsonb_build_object('images',images,'version',version)) FROM public.website_menus),'{}'::jsonb))
$$;
