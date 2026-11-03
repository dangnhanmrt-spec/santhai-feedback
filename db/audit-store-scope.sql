-- Audit scope is independent of Feedback's operating status.
-- Preserve the existing 65-store scope when introducing the feature.
alter table public.audit_stores add column in_scope boolean not null default false;
update public.audit_stores set in_scope=active and not historical_only;
alter table public.audit_stores add constraint audit_historical_out_of_scope check(not historical_only or not in_scope);
create unique index audit_stores_feedback_mapping on public.audit_stores(current_store_id) where current_store_id is not null;

-- Feedback only synchronizes metadata for stores already added to Audit.
-- New Feedback stores require an explicit Admin Audit add action.
create or replace function feedback_private.sync_audit_store()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.audit_stores set name=new.name,region_id=new.region_id,active=coalesce(new.active,true)
 where current_store_id=new.id and not historical_only;
 return new;
end $$;

create function public.audit_feedback_store_choices()
returns table(id text,name text,region_id text,active boolean)
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or feedback_private.module_role('audit') is distinct from 'admin' then
  raise exception 'Chỉ Admin Audit được quản lý danh sách cửa hàng' using errcode='42501';
 end if;
 return query select s.id,s.name,s.region_id,s.active from public.stores s order by s.name;
end $$;
revoke all on function public.audit_feedback_store_choices() from public,anon;
grant execute on function public.audit_feedback_store_choices() to authenticated;

create function feedback_private.audit_add_store(p_store text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.stores%rowtype; a public.audit_stores%rowtype;
begin
 if auth.uid() is null or feedback_private.module_role('audit') is distinct from 'admin' then
  raise exception 'Chỉ Admin Audit được thêm cửa hàng' using errcode='42501';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('audit-store:'||p_store,0));
 select * into s from public.stores where id=p_store for share;
 if not found then raise exception 'Cửa hàng không có trong danh mục Feedback'; end if;
 select * into a from public.audit_stores where current_store_id=p_store or id=p_store for update;
 if found then
  if a.historical_only or a.current_store_id is distinct from p_store then raise exception 'Không thể ghép với nhãn cửa hàng lịch sử'; end if;
  return to_jsonb(a); -- Safe duplicate/retry: do not change an existing scope.
 end if;
 insert into public.audit_stores(id,name,region_id,active,current_store_id,historical_only,in_scope)
 values(s.id,s.name,s.region_id,s.active,s.id,false,true) returning * into a;
 insert into public.audit_activity_log(actor_email,action,entity,entity_id,details)
 values(lower(auth.jwt()->>'email'),'INSERT','audit_stores',a.id,jsonb_build_object('after',to_jsonb(a)));
 return to_jsonb(a);
end $$;

create function feedback_private.audit_set_store_scope(p_store text,p_in_scope boolean,p_expected_in_scope boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.audit_stores%rowtype; before_row jsonb;
begin
 if auth.uid() is null or feedback_private.module_role('audit') is distinct from 'admin' then
  raise exception 'Chỉ Admin Audit được ẩn hoặc hiện cửa hàng' using errcode='42501';
 end if;
 if p_in_scope is null or p_expected_in_scope is null then raise exception 'Thiếu trạng thái cửa hàng'; end if;
 select * into a from public.audit_stores where id=p_store for update;
 if not found then raise exception 'Cửa hàng chưa được thêm vào Audit'; end if;
 if a.historical_only or a.current_store_id is null then raise exception 'Nhãn lịch sử chỉ dùng tra cứu'; end if;
 if a.in_scope=p_in_scope then return to_jsonb(a); end if;
 if a.in_scope is distinct from p_expected_in_scope then raise exception 'Phạm vi cửa hàng đã thay đổi. Tải lại danh sách rồi thử lại.'; end if;
 before_row:=to_jsonb(a);
 update public.audit_stores set in_scope=p_in_scope where id=p_store returning * into a;
 insert into public.audit_activity_log(actor_email,action,entity,entity_id,details)
 values(lower(auth.jwt()->>'email'),'UPDATE','audit_stores',a.id,jsonb_build_object('before',before_row,'after',to_jsonb(a)));
 return to_jsonb(a);
end $$;

revoke all on function feedback_private.audit_add_store(text) from public,anon;
revoke all on function feedback_private.audit_set_store_scope(text,boolean,boolean) from public,anon;
grant execute on function feedback_private.audit_add_store(text) to authenticated;
grant execute on function feedback_private.audit_set_store_scope(text,boolean,boolean) to authenticated;
create function public.audit_add_store(p_store text)
returns jsonb language sql security invoker set search_path='' as $$select feedback_private.audit_add_store(p_store)$$;
create function public.audit_set_store_scope(p_store text,p_in_scope boolean,p_expected_in_scope boolean)
returns jsonb language sql security invoker set search_path='' as $$select feedback_private.audit_set_store_scope(p_store,p_in_scope,p_expected_in_scope)$$;
revoke all on function public.audit_add_store(text) from public,anon;
revoke all on function public.audit_set_store_scope(text,boolean,boolean) from public,anon;
grant execute on function public.audit_add_store(text) to authenticated;
grant execute on function public.audit_set_store_scope(text,boolean,boolean) to authenticated;

-- Enforce scope even for a stale form or a direct REST write.
-- Row locks serialize saves with a concurrent hide action.
create function feedback_private.require_audit_store_scope()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and new.source='manual' then
  perform 1 from public.audit_stores where id=new.store_id and in_scope and not historical_only for share;
  if not found then raise exception 'Cửa hàng đã nằm ngoài phạm vi Audit. Vui lòng tải lại danh sách.' using errcode='23514'; end if;
 end if;
 return new;
end $$;
revoke all on function feedback_private.require_audit_store_scope() from public,anon;
create trigger audit_inspection_store_scope before insert on public.audit_inspections
for each row execute function feedback_private.require_audit_store_scope();
create trigger audit_hygiene_store_scope before insert or update on public.audit_hygiene
for each row execute function feedback_private.require_audit_store_scope();
