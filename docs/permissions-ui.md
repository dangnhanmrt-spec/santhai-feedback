# Hiển thị quyền chi tiết

Các màn phân quyền Feedback, Audit và Website dùng chung `src/access/AccountPermissions.jsx`. Cột thứ ba là Quyền chi tiết. Mỗi dòng tóm tắt ba bộ phận; khi mở, chi tiết nằm trong một hàng riêng trải hết chiều rộng bảng, chỉ mở một tài khoản mỗi lần. Nội dung theo đúng tài khoản, không suy quyền từ vai trò của tài khoản đang quản trị.

Mẫu chi tiết thống nhất:

- Tên bộ phận và mức quyền hiện tại.
- Xem: các màn và thông tin được tra cứu.
- Thao tác dữ liệu: hành động thêm, sửa, xóa hoặc cập nhật được phép.
- Quản lý: danh mục, cửa hàng nội bộ và phân quyền theo giới hạn hiện có.
- Chức năng dùng chung: Tổng quan theo bộ phận được cấp quyền; Sao lưu và khôi phục chỉ dành cho chủ hệ thống.

`capabilities.js` chỉ tạo mô tả. Nó không được dùng để quyết định hoặc cấp quyền. Các giới hạn được đối chiếu từ guard giao diện, `db/audit-v1.sql`, `db/audit-delete.sql`, `db/audit-bulk.sql`, `db/website-admin-v1.sql` và `server/backup-core.js`.

Các điểm cần giữ:

- Feedback có Chỉ xem và Admin. Admin sửa feedback, quản lý cửa hàng nội bộ và xem phân quyền; chỉ chủ hệ thống đổi quyền Feedback.
- Audit có Chỉ xem, Nhập liệu và Admin. Nhập liệu ghi nhận Audit/vệ sinh và nhập hàng loạt. Chỉ Admin Audit xóa lỗi/lượt kiểm tra, quản lý loại vi phạm và cấp quyền Audit cho tài khoản có sẵn, trừ chủ hệ thống.
- Website có Chỉ xem, Chỉnh sửa và Admin. Chỉnh sửa/Admin sửa hồ sơ công khai, ẩn/hiện và cập nhật menu. Chỉ chủ hệ thống thêm nhân sự và cấp quyền Website.
- Không truy cập được ghi rõ, không bỏ trống. Vai trò không nhận diện được không được mô tả như quyền cao hơn.
- Giá trị và khóa của các ô đổi quyền không thay đổi. Không cấp/thu hồi quyền thật để kiểm thử giao diện.
- Website tải thêm danh sách quyền ba bộ phận bằng truy vấn chỉ đọc, theo RLS hiện hành; không mở rộng policy.

Kiểm tra `tests/access-capabilities.test.mjs`, toàn bộ `npm test`, build và xem thật cả ba màn phân quyền sau triển khai. Ảnh minh chứng phải loại vùng email và thông tin cá nhân.
