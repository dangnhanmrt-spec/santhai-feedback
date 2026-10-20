-- Additive, reversible removal of Audit records. Existing rows remain unchanged.
BEGIN;
ALTER TABLE public.audit_inspections ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
 ADD COLUMN IF NOT EXISTS deleted_by text, ADD COLUMN IF NOT EXISTS deletion_reason text;
ALTER TABLE public.audit_violations ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
 ADD COLUMN IF NOT EXISTS deleted_by text, ADD COLUMN IF NOT EXISTS deletion_reason text;

-- Only the scoped RPC may update removal markers; clients receive no UPDATE grants.
REVOKE UPDATE ON public.audit_inspections,public.audit_violations FROM authenticated,anon;
ALTER POLICY inspections_insert ON public.audit_inspections WITH CHECK (
 (SELECT feedback_private.module_role('audit')) IN ('admin','editor') AND source='manual'
 AND counted_for_rate AND created_by=auth.uid() AND source_keys='[]'::jsonb
 AND deleted_at IS NULL AND deleted_by IS NULL AND deletion_reason IS NULL);
ALTER POLICY violations_insert ON public.audit_violations WITH CHECK (
 (SELECT feedback_private.module_role('audit')) IN ('admin','editor')
 AND deleted_at IS NULL AND deleted_by IS NULL AND deletion_reason IS NULL
 AND EXISTS(SELECT 1 FROM public.audit_inspections i WHERE i.id=inspection_id
 AND i.source='manual' AND i.created_by=auth.uid() AND i.deleted_at IS NULL));

CREATE OR REPLACE FUNCTION feedback_private.audit_remove_entry(
 p_inspection uuid,p_violation uuid,p_reason text,p_expected_issues integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_inspection public.audit_inspections%ROWTYPE; v_issues jsonb;
 v_count integer; v_remove_parent boolean; v_stamp timestamptz:=clock_timestamp();
 v_actor text:=lower(auth.jwt()->>'email');
BEGIN
 IF auth.uid() IS NULL OR feedback_private.module_role('audit') IS DISTINCT FROM 'admin' THEN
  RAISE EXCEPTION 'Chỉ Admin Audit được xóa lỗi hoặc lượt kiểm tra' USING ERRCODE='42501';
 END IF;
 IF p_reason IS NULL OR length(trim(p_reason))=0 OR length(p_reason)>1000 THEN
  RAISE EXCEPTION 'Nhập lý do xóa từ 1 đến 1000 ký tự';
 END IF;
 SELECT * INTO v_inspection FROM public.audit_inspections
 WHERE id=p_inspection AND deleted_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lượt kiểm tra không tồn tại hoặc đã bị xóa'; END IF;
 SELECT count(*),coalesce(jsonb_agg(to_jsonb(v)),'[]'::jsonb) INTO v_count,v_issues
 FROM public.audit_violations v WHERE inspection_id=p_inspection AND deleted_at IS NULL;
 IF p_expected_issues IS DISTINCT FROM v_count THEN
  RAISE EXCEPTION 'Danh sách lỗi đã thay đổi. Đóng hộp thoại, làm mới dữ liệu rồi chọn lại';
 END IF;
 IF p_violation IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.audit_violations
 WHERE id=p_violation AND inspection_id=p_inspection AND deleted_at IS NULL) THEN
  RAISE EXCEPTION 'Lỗi không thuộc lượt kiểm tra này hoặc đã bị xóa';
 END IF;
 v_remove_parent:=p_violation IS NULL OR v_count=1;
 UPDATE public.audit_violations SET deleted_at=v_stamp,deleted_by=v_actor,deletion_reason=trim(p_reason)
 WHERE inspection_id=p_inspection AND deleted_at IS NULL AND (p_violation IS NULL OR id=p_violation);
 IF v_remove_parent THEN
  UPDATE public.audit_inspections SET deleted_at=v_stamp,deleted_by=v_actor,deletion_reason=trim(p_reason)
  WHERE id=p_inspection;
 END IF;
 INSERT INTO public.audit_activity_log(actor_email,action,entity,entity_id,details)
 VALUES(v_actor,CASE WHEN p_violation IS NULL THEN 'REMOVE_INSPECTION' ELSE 'REMOVE_VIOLATION' END,
 CASE WHEN p_violation IS NULL THEN 'audit_inspections' ELSE 'audit_violations' END,
 coalesce(p_violation,p_inspection)::text,jsonb_build_object('reason',trim(p_reason),
 'inspection_before',to_jsonb(v_inspection),'violations_before',v_issues,
 'inspection_removed',v_remove_parent,'deleted_at',v_stamp));
 RETURN jsonb_build_object('inspection_id',p_inspection,'violation_id',p_violation,'inspection_removed',v_remove_parent);
END $$;
REVOKE ALL ON FUNCTION feedback_private.audit_remove_entry(uuid,uuid,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION feedback_private.audit_remove_entry(uuid,uuid,text,integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.audit_remove_entry(
 p_inspection uuid,p_violation uuid,p_reason text,p_expected_issues integer
) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT feedback_private.audit_remove_entry(p_inspection,p_violation,p_reason,p_expected_issues)
$$;
REVOKE ALL ON FUNCTION public.audit_remove_entry(uuid,uuid,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.audit_remove_entry(uuid,uuid,text,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
