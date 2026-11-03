begin;
-- All fixtures, scope changes, inspection writes and journal rows roll back.
insert into public.stores(id,name,region_id,active)
select '__audit_scope_rollback_fixture__','Kiểm thử phạm vi Audit',region_id,false from public.stores limit 1;
do $$begin
 if exists(select 1 from public.audit_stores where id='__audit_scope_rollback_fixture__') then
  raise exception 'New Feedback stores must wait for explicit Audit add';
 end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',u.id,'email',u.email,'role','authenticated')::text,true)
from auth.users u join public.feedback_module_access a on a.email=lower(u.email) where a.module='audit' and a.role='admin' limit 1;
set local role authenticated;
do $$
declare a jsonb; before_count bigint; original_feedback jsonb; existing_id text; histories bigint;
begin
 a:=public.audit_add_store('__audit_scope_rollback_fixture__');
 if a->>'current_store_id'<>'__audit_scope_rollback_fixture__' or not (a->>'in_scope')::boolean or (a->>'active')::boolean then raise exception 'Feedback mapping or independent scope failed'; end if;
 select count(*) into before_count from public.audit_activity_log where entity_id='__audit_scope_rollback_fixture__';
 perform public.audit_add_store('__audit_scope_rollback_fixture__');
 if (select count(*) from public.audit_activity_log where entity_id='__audit_scope_rollback_fixture__')<>before_count then raise exception 'Duplicate add created journal/data'; end if;
 -- Explicit Audit inclusion is independent of Feedback active=false.
 perform public.audit_save_inspection('__audit_scope_rollback_fixture__',now()-interval '1 minute','','[]'::jsonb);
 perform public.audit_set_store_scope('__audit_scope_rollback_fixture__',false,true);
 perform public.audit_add_store('__audit_scope_rollback_fixture__');
 if (select in_scope from public.audit_stores where id='__audit_scope_rollback_fixture__') then raise exception 'Retry/add unhid an existing store'; end if;
 begin
  perform public.audit_save_inspection('__audit_scope_rollback_fixture__',now()-interval '1 minute','','[]'::jsonb);
  raise exception 'Hidden inspection accepted';
 exception when others then if sqlerrm not like '%phạm vi Audit%' then raise; end if; end;
 begin
  insert into public.audit_hygiene(store_id,audit_date,shift,status,source,source_keys,created_by)
  values('__audit_scope_rollback_fixture__',current_date,1,'pass','manual','[]'::jsonb,auth.uid());
  raise exception 'Hidden hygiene accepted';
 exception when check_violation then null; end;
 begin
  perform public.audit_save_bulk(gen_random_uuid(),'inspection',jsonb_build_array(jsonb_build_object('store_id','__audit_scope_rollback_fixture__','occurred_at',now()-interval '1 minute','clear',true,'issues','[]'::jsonb)));
  raise exception 'Hidden bulk accepted';
 exception when others then if sqlerrm not like '%phạm vi Audit%' then raise; end if; end;
 perform public.audit_set_store_scope('__audit_scope_rollback_fixture__',true,false);
 perform public.audit_save_inspection('__audit_scope_rollback_fixture__',now()-interval '1 minute','','[]'::jsonb);
 select id into existing_id from public.audit_stores where in_scope and current_store_id is not null and id<>'__audit_scope_rollback_fixture__' limit 1;
 select to_jsonb(s) into original_feedback from public.stores s where id=existing_id;
 select count(*) into histories from public.audit_inspections where store_id=existing_id;
 perform public.audit_set_store_scope(existing_id,false,true);
 if (select to_jsonb(s) from public.stores s where id=existing_id) is distinct from original_feedback then raise exception 'Feedback was changed'; end if;
 if (select count(*) from public.audit_inspections where store_id=existing_id)<>histories then raise exception 'History was changed'; end if;
 begin
  perform public.audit_set_store_scope((select id from public.audit_stores where historical_only limit 1),true,false);
  raise exception 'Historical alias can be added';
 exception when others then if sqlerrm not like '%lịch sử%' then raise; end if; end;
end $$;
reset role;
-- Metadata refresh cannot undo a hidden scope.
update public.stores set name=name where id in(select current_store_id from public.audit_stores where not in_scope);
do $$begin
 if (select count(*) from public.audit_stores where in_scope)<>65 then raise exception 'Feedback sync changed scope'; end if;
end $$;
-- Test every existing editor/viewer role, then an unknown authenticated account.
do $$
declare u record;
begin
 for u in select a.role,usr.id,usr.email from public.feedback_module_access a join auth.users usr on lower(usr.email)=a.email where a.module='audit' and a.role in ('editor','viewer') loop
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u.id,'email',u.email,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  begin perform public.audit_add_store('__audit_scope_rollback_fixture__');raise exception 'Non-admin added store';exception when insufficient_privilege then null;end;
  begin perform public.audit_set_store_scope('__audit_scope_rollback_fixture__',false,true);raise exception 'Non-admin changed scope';exception when insufficient_privilege then null;end;
  begin perform public.audit_feedback_store_choices();raise exception 'Non-admin read management choices';exception when insufficient_privilege then null;end;
  execute 'reset role';
 end loop;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'email','scope-test-outsider@example.invalid','role','authenticated')::text,true);
 execute 'set local role authenticated';
 begin perform public.audit_set_store_scope('__audit_scope_rollback_fixture__',false,true);raise exception 'Outsider changed scope';exception when insufficient_privilege then null;end;
 execute 'reset role';
 if has_function_privilege('anon','public.audit_add_store(text)','execute') or has_function_privilege('anon','public.audit_set_store_scope(text,boolean,boolean)','execute') then raise exception 'Anonymous management RPC access'; end if;
end $$;
select 'PASS - add/mapping/retry, hide/show, stale form guards, Feedback sync isolation, preserved history, admin-only writes' as result;
rollback;
