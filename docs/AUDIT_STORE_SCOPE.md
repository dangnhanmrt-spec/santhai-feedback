# Danh sách cửa hàng Audit

- Vị trí: Audit nội bộ -> Quản lý -> Danh sách cửa hàng. Chỉ Admin Audit được thêm, ẩn và hiện.
- Thêm: chọn cửa hàng chưa được thêm từ danh mục Feedback. Giữ nguyên ID, tên và khu vực để liên kết đúng cửa hàng; không nhập tên tự do, không tạo cửa hàng Feedback.
- Ẩn/hiện: thay đổi `audit_stores.in_scope`, độc lập với `stores.active` và thông tin công khai trên website. Cửa hàng mới trong Feedback không tự đi vào Audit; tên/khu vực/trạng thái hoạt động của cửa hàng đã liên kết vẫn cập nhật theo Feedback, không ghi đè phạm vi Audit.
- Tổng quan, bảng tuần, thống kê, nhập đơn lẻ và nhập hàng loạt chỉ dùng cửa hàng trong phạm vi. Tổng quan chung cũng dùng cùng danh sách Audit.
- Lịch sử vẫn giữ toàn bộ bản ghi. Tại Lịch sử kiểm tra, mở Lọc khu vực / cửa hàng và bật Gồm cửa hàng đã ẩn / lịch sử để tra cứu. Không mở nút nhập cho cửa hàng ngoài phạm vi.
- Bảy nhãn lịch sử không liên kết với Feedback chỉ dùng tra cứu, không đưa vào danh sách thêm/ẩn/hiện.
- Các thao tác thêm/ẩn/hiện được ghi trong Nhật ký thao tác. RPC kiểm quyền ở database; chặn cả biểu mẫu cũ, nhập hàng loạt và ghi vệ sinh trực tiếp cho cửa hàng đã ẩn. Thử lại thao tác thêm không sinh mapping hoặc log trùng và không tự hiện cửa hàng đã ẩn.
- Nút Làm mới tải lại danh mục Feedback và phạm vi Audit khi có thay đổi từ phiên khác.

## Cơ sở dữ liệu và tương thích

Mốc khởi tạo giữ phạm vi đang có: 80 cửa hàng liên kết, 65 hiện, 15 ẩn, thêm 7 nhãn lịch sử ngoài phạm vi. Không tự suy đoán những cửa hàng nào do đối tác hoặc khu vực khác quản lý.

Migration `audit_independent_store_scope` gồm, theo thứ tự: `db/audit-store-scope.sql`, `db/audit-store-scope-rpcs.sql`, `db/audit-store-scope-backup.sql`. Bản sao cũ chưa có `in_scope` được bổ sung giá trị hiện tại khi phục hồi; không gây lỗi null hoặc tự thay phạm vi do thiếu trường mới.

## Kiểm chứng

- `npm test`, `npm run build`.
- `tests/sql/audit-store-scope-rollback.sql`: thêm từ Feedback, giữ mapping, gửi lại yêu cầu, ẩn/hiện độc lập active, bảo toàn lịch sử và danh mục Feedback, đồng bộ metadata không tự hiện lại, chặn form cũ, vệ sinh trực tiếp và bulk ngoài phạm vi; từ chối editor/viewer/người ngoài/anonymous. Tất cả fixture và dữ liệu kiểm thử nằm trong giao dịch rollback.
- Chỉ kiểm giao diện bằng dữ liệu có sẵn trên Production. Không ẩn/hiện cửa hàng thật chỉ để thử tính năng.
