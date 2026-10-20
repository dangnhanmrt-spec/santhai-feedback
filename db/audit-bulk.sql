-- Atomic bulk entry. Existing per-record policies and logging remain authoritative.
CREATE TABLE public.audit_bulk_requests (
 request_id uuid NOT NULL, created_by uuid NOT NULL DEFAULT auth.uid(),
 payload_hash text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(created_by,request_id)
);
ALTER TABLE public.audit_bulk_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.audit_bulk_requests FROM anon,authenticated;
GRANT SELECT,INSERT ON public.audit_bulk_requests TO authenticated;
CREATE POLICY bulk_read ON public.audit_bulk_requests FOR SELECT TO authenticated
 USING(created_by=(SELECT auth.uid()) AND coalesce((SELECT feedback_private.module_role('audit')) IN('admin','editor'),false));
CREATE POLICY bulk_insert ON public.audit_bulk_requests FOR INSERT TO authenticated
 WITH CHECK(created_by=(SELECT auth.uid()) AND coalesce((SELECT feedback_private.module_role('audit')) IN('admin','editor'),false));

CREATE OR REPLACE FUNCTION public.audit_save_bulk(p_request_id uuid,p_kind text,p_rows jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE r jsonb; previous public.audit_bulk_requests%ROWTYPE; h public.audit_hygiene%ROWTYPE;
 fingerprint text; result jsonb; saved_ids jsonb:='[]'; v_id uuid; v_day date; v_shift smallint;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(feedback_private.module_role('audit') IN('admin','editor'),false) THEN RAISE EXCEPTION 'Không có quyền nhập Audit'; END IF;
 IF p_request_id IS NULL OR p_kind IS NULL OR p_kind NOT IN('inspection','hygiene') OR jsonb_typeof(p_rows) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Đợt nhập không hợp lệ'; END IF;
 IF jsonb_array_length(p_rows) NOT BETWEEN 1 AND 300 OR octet_length(p_rows::text)>1048576 THEN RAISE EXCEPTION 'Mỗi đợt nhập từ 1 đến 300 dòng, tối đa 1 MB'; END IF;
 fingerprint:=md5(p_kind||p_rows::text);
 -- Serialize retries of the same authenticated request, including concurrent tabs.
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
 SELECT * INTO previous FROM public.audit_bulk_requests WHERE created_by=auth.uid() AND request_id=p_request_id;
 IF FOUND THEN
  IF previous.payload_hash<>fingerprint THEN RAISE EXCEPTION 'Đợt nhập này đã lưu với nội dung khác. Kiểm tra lịch sử trước khi nhập tiếp.'; END IF;
  RETURN previous.result;
 END IF;
 IF p_kind='inspection' AND EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) x GROUP BY x->>'store_id' HAVING count(*)>1) THEN RAISE EXCEPTION 'Một cửa hàng chỉ có một lượt trong mỗi đợt nhập'; END IF;
 IF p_kind='hygiene' AND EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) x GROUP BY x->>'store_id',x->>'audit_date',x->>'shift' HAVING count(*)>1) THEN RAISE EXCEPTION 'Trùng cửa hàng, ngày và ca'; END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(p_rows) ORDER BY value->>'store_id',value->>'shift' LOOP
  IF NOT EXISTS(SELECT 1 FROM public.audit_stores WHERE id=r->>'store_id' AND active) THEN RAISE EXCEPTION 'Cửa hàng không hoạt động'; END IF;
  IF p_kind='inspection' THEN
   IF r->>'occurred_at' IS NULL OR jsonb_typeof(r->'issues') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Thiếu thời điểm hoặc nội dung Audit'; END IF;
   IF jsonb_array_length(r->'issues')=0 AND (r->>'clear') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Cần xác nhận đã kiểm tra không vi phạm'; END IF;
   IF jsonb_array_length(r->'issues')>0 AND (r->>'clear')='true' THEN RAISE EXCEPTION 'Lượt có lỗi không thể đánh dấu không vi phạm'; END IF;
   v_id:=public.audit_save_inspection(r->>'store_id',(r->>'occurred_at')::timestamptz,coalesce(r->>'note',''),r->'issues');
  ELSE
   v_day:=(r->>'audit_date')::date; v_shift:=(r->>'shift')::smallint;
   IF v_day IS NULL OR v_day>(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date OR v_shift IS NULL OR v_shift NOT BETWEEN 1 AND 3 THEN RAISE EXCEPTION 'Ngày hoặc ca không hợp lệ'; END IF;
   SELECT * INTO h FROM public.audit_hygiene WHERE store_id=r->>'store_id' AND audit_date=v_day AND shift=v_shift FOR UPDATE;
   IF FOUND THEN
    IF h.source='legacy' THEN RAISE EXCEPTION 'Không sửa ca nhập từ dữ liệu lịch sử'; END IF;
    IF coalesce(r->>'expected_updated_at','')='' OR h.updated_at IS DISTINCT FROM (r->>'expected_updated_at')::timestamptz THEN RAISE EXCEPTION 'Ca đã thay đổi. Quay lại tạo bảng xem trước để tải kết quả mới.'; END IF;
    UPDATE public.audit_hygiene SET status=r->>'status',note=coalesce(r->>'note',''),reason=CASE WHEN r->>'status'='unavailable' THEN coalesce(r->>'reason','') ELSE '' END,
     created_by=auth.uid(),updated_at=clock_timestamp(),source_keys='[]'::jsonb
     WHERE id=h.id RETURNING id INTO v_id;
   ELSE
    IF coalesce(r->>'expected_updated_at','')<>'' THEN RAISE EXCEPTION 'Ca không còn tồn tại. Vui lòng tải lại bảng xem trước.'; END IF;
    INSERT INTO public.audit_hygiene(store_id,audit_date,shift,status,note,reason,source,created_by)
     VALUES(r->>'store_id',v_day,v_shift,r->>'status',coalesce(r->>'note',''),CASE WHEN r->>'status'='unavailable' THEN coalesce(r->>'reason','') ELSE '' END,'manual',auth.uid()) RETURNING id INTO v_id;
   END IF;
  END IF;
  saved_ids:=saved_ids||jsonb_build_array(v_id);
 END LOOP;
 result:=jsonb_build_object('saved',jsonb_array_length(saved_ids),'ids',saved_ids,'kind',p_kind);
 INSERT INTO public.audit_bulk_requests(request_id,payload_hash,result) VALUES(p_request_id,fingerprint,result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.audit_save_bulk(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.audit_save_bulk(uuid,text,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
