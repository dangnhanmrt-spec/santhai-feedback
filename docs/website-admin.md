# Website cửa hàng

Module quản trị trong SanThai Feedback, dùng chung đăng nhập Google nhưng quyền `website` độc lập với `feedback` và `audit`.

## Vận hành

- Chủ hệ thống cấp quyền tại Website cửa hàng > Phân quyền, bằng email Google của nhân sự. Cấp quyền website không tự cấp Feedback/Audit.
- Nhân sự chỉ xem có thể tra cứu cửa hàng, menu và lịch sử. Editor/admin được thêm hoặc sửa hồ sơ website, ẩn/hiện và thay menu. Chỉ chủ hệ thống cấp hoặc thu hồi quyền.
- Cửa hàng mới mặc định ẩn. Lưu khi đã bật hiển thị sẽ công khai hồ sơ trên website khách.
- Trạng thái website độc lập với `stores.active`. Không thay đổi tên, trạng thái hoặc dữ liệu báo cáo nội bộ khi sửa hồ sơ website.
- Link nội bộ dùng để đối chiếu danh tính. Hồ sơ chưa có mã tương ứng vẫn quản lý độc lập; không tự ghép các tên mơ hồ.
- Các trường công khai: tên, khu vực, địa chỉ, Maps, Plus Code, tọa độ, giao tận nơi, đặt trước ghé lấy, hotline, app/ghi chú, nhóm menu.
- Mua tại cửa hàng luôn có sẵn; Zalo dùng tài khoản cá nhân SanThai chung. Hotline riêng được hiển thị công khai và không tự coi là tài khoản Zalo.
- Menu có hai nhóm: miền Trung / các cửa hàng còn lại. Đổi nhóm ở từng cửa hàng khi cần. Mỗi nhóm 1-8 ảnh JPG/PNG/WebP, tối đa 12 MB mỗi ảnh. Có xem trước, đổi thứ tự và bỏ ảnh trước khi lưu.
- Website đọc danh mục công khai mới khi mở trang, mỗi 30 giây khi trang đang mở, khi quay lại trang hoặc khi có mạng trở lại. Không cần triển khai lại mã nguồn để cập nhật nội dung.
- Khi lỗi kết nối, website báo lỗi và cho thử lại. Không dùng danh mục cũ đóng trong mã để tự hiển thị lại cửa hàng đã ẩn.
- Form phát hiện phiên bản đã thay đổi trong lúc chỉnh sửa và yêu cầu tải lại thay vì ghi đè.

## Dữ liệu và kiểm soát

### Giao diện quản trị desktop

- Danh sách hồ sơ dùng bảng với tên/địa chỉ, khu vực, phương thức/hotline/ghi chú app, nhóm menu, trạng thái và thao tác. Bộ tìm/lọc ghim khi chạm mép trên, tên cột ghim ngay bên dưới; phần tiêu đề ứng dụng cuộn đi. Desktop dùng cuộn trang, không giới hạn chiều cao bảng. Chiều cao khung lọc được đo lại khi đổi kích thước để tránh chồng lên tên cột. Bấm tên hoặc Chỉnh sửa để mở hồ sơ.
- Website quản trị dùng hết chiều ngang desktop. Dải tìm/lọc và nền tên cột phủ ngang, không bị bó trong khung 1400px khi cuộn. Dải tìm/lọc dùng nền xanh teal, trường nhập tối và nhấn cyan; tên cột dùng xanh navy riêng, dữ liệu giữ nền tối trung tính. Quy tắc bỏ lề body chỉ có hiệu lực khi module Website đang mở.
- Tóm tắt trong form hiện hotline và từng app kèm ghi chú, nhóm menu và trạng thái. Đây là đối chiếu nội dung, không mô phỏng bố cục website khách.
- Lịch sử có bộ lọc loại nội dung, cửa hàng/nhóm menu, người sửa và khoảng ngày Việt Nam. Bộ lọc áp dụng trước phân trang trên toàn bộ lịch sử theo quyền hiện có. Xem thay đổi mở trước/sau; ảnh menu có thumbnail và liên kết ảnh gốc.
- Thay đổi giao diện chỉ nằm trong `src/website`. Không đổi CSS dùng chung, dữ liệu/schema/RLS hoặc các hàm ghi hồ sơ/menu/phân quyền. Khi nhân sự bấm lưu hồ sơ/menu, website khách vẫn cập nhật theo cơ chế hiện hành.

- `website_store_profiles`: hồ sơ công khai, mã nội bộ tùy chọn, phiên bản và thời điểm cập nhật.
- `website_menus`: danh sách ảnh theo nhóm, phiên bản và thời điểm cập nhật.
- `website_activity`: lịch sử nguyên tử trước/sau, người sửa lấy từ JWT xác thực. Trình duyệt không được ghi hoặc xóa lịch sử.
- RLS giới hạn quyền đọc/ghi ở database; anon chỉ đọc cột công khai của hồ sơ đang hiển thị. Mã nội bộ và lịch sử không được cấp cho anon.
- Storage `website-menus`: tải ảnh công khai, upload chỉ cho editor/admin website. Tên file có UUID; không cho ghi đè/xóa ảnh cũ từ client, để giữ các phiên bản đã tham chiếu.
- Không có chức năng xóa hồ sơ cửa hàng. Ẩn thay cho xóa.
- Snapshot backup được mở rộng để chứa ba bảng website. Luồng khôi phục Feedback/Audit hiện có không tự ghi đè website. Snapshot chứa URL ảnh; dữ liệu ảnh cũ được giữ trong Storage.

## Khởi tạo và kiểm thử

1. Áp dụng `db/website-admin-v1.sql`, tiếp theo `db/website-admin-stamp-fix.sql` và `db/website-catalog-order.sql`.
2. Dữ liệu hiện hành đã được chuyển một lần từ website gốc, gồm các hồ sơ đang ẩn. Không tự nạp lại khi khởi động ứng dụng. Bản sao dữ liệu vận hành được giữ trong database/backup, không đóng vào mã frontend.
3. Triển khai frontend/backup validator trước khi áp dụng `db/website-backup.sql`.
4. Website khách dùng `website_public_catalog()` (security invoker) với anon key; không có service-role key ở trình duyệt.

Dữ liệu ban đầu gồm 85 hồ sơ, 82 đang hiển thị và 3 đang ẩn. Phương thức được đối chiếu với sheet Maps (E-I), giữ SHIPPING, ghi chú Lấp Vò và các hotline hiện hành. 73 hồ sơ có mã nội bộ đối chiếu chắc chắn; 12 hồ sơ chưa tự ghép, gồm trường hợp Huế có nhiều mã nội bộ gần trùng. Không tạo mới cửa hàng nội bộ từ dữ liệu website.

Kiểm tra: `npm test`, `npm run build`, và SQL `tests/sql/website-permissions.sql`. SQL tạo dữ liệu tạm trong transaction rồi rollback; không để lại cửa hàng/tài khoản thử nghiệm. Kiểm tra UI dùng request giả lập tại bản build cục bộ; kiểm tra API công khai dùng anon thật. Phải giữ giao diện menu khách, zoom/pinch/tải bản gốc, các phương thức và bảng chính sách đã duyệt.
