# Tham khảo thiết kế Website cửa hàng

Ngày rà soát: 02/11/2026, giờ Việt Nam. Đây là ghi nhận nghiên cứu và lựa chọn của AI, không phải nghiệm thu thiết kế của anh Nhân.

## Quyết định hiện hành

- Quản trị ưu tiên desktop và hiệu quả quản lý. Feedback là tham chiếu trực tiếp về bố cục, Lexend, màu, mật độ và hành vi cuộn.
- Giữ nội dung tối đa 1400px, căn giữa. Để trống hai bên cả khi cuộn. Không kéo bảng rộng toàn màn hình và không phủ nền dải ghim ra ngoài bảng.
- Chỉ ghim từ bộ tìm/lọc cửa hàng và hàng tên cột. Không ghim lại mọi tiêu đề, tài khoản hay điều hướng phía trên.
- Phân cấp bằng vai trò: nền bộ lọc nâng nhẹ, ô nhập tối hơn, hàng tên cột sáng hơn thân bảng. Nhãn và đường phân cách giúp nhận biết vùng điều khiển. Bóng nhẹ dưới tên cột chỉ báo lớp đang nằm trên dữ liệu.
- Không đổi thiết kế các tab khác, dữ liệu, quyền hoặc API vì một yêu cầu sửa màu phần ghim.

## Những nguồn đã đọc

Nguồn dưới đây là tài liệu do tác giả hoặc đơn vị sở hữu công bố. Các bộ kỹ năng có thể dùng chung trên nhiều trình soạn mã/AI; tên nền tảng không tạo thành một hệ thiết kế mới. Việc tìm đọc không đồng nghĩa đã cài đặt hoặc chạy công cụ của bên đó.

| Nguồn | Phần đã đọc | Điều áp dụng |
| --- | --- | --- |
| [Anthropic frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) | Yêu cầu thiết kế, quy trình, tiết chế và tự phê bình | Bám yêu cầu cụ thể, hệ token gọn, xem ảnh thật; không lấy phong cách mặc định thay yêu cầu |
| [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines) và [skill](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md) | Bàn phím, focus, biểu mẫu, chữ, trạng thái và sticky | Không che focus; giữ nhãn, hành vi và trạng thái nhất quán |
| [Impeccable](https://github.com/pbakaus/impeccable), [Operate](https://github.com/pbakaus/impeccable/blob/main/skill/reference/operate.md) | Skill gốc, Operate, phần đầu hướng dẫn colorize và critique | Công cụ quản lý cần sự quen thuộc, tính nhất quán và tiết chế; refinement phải giữ bản sắc hiện có |
| [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/SKILL.md) | Thứ tự ưu tiên, workflow và hệ quy tắc | Dùng như danh mục kiểm tra; không tự thay font/palette hoặc áp mobile-first trái yêu cầu desktop của dự án |
| [IBM Carbon Data table](https://carbondesignsystem.com/components/data-table/usage/) | Anatomy, placement, density và toolbar | Tìm/lọc thuộc vùng điều khiển bảng; giữ trục cột và mật độ phù hợp công việc |
| [Microsoft Fluent 2 Color](https://fluent2.microsoft.design/color) | Neutral, shared, brand, semantic và interaction | Dùng nền trung tính để tạo phân cấp; màu nhấn có giới hạn, trạng thái có ý nghĩa |
| [Adobe Spectrum Colors](https://spectrum.adobe.com/page/color-system/) | Phân lớp nền, tính nhất quán và tương phản | Tách tầng bằng nền và chữ; tránh màu dư thừa cạnh tranh với thao tác và trạng thái |
| [Atlassian Elevation](https://atlassian.design/foundations/elevation/) | Elevation trong dark theme | Nền là tín hiệu chính của tầng; bóng chỉ hỗ trợ, dùng có giới hạn |
| [GOV.UK Layout](https://design-system.service.gov.uk/styles/layout/) | Khung nội dung và giới hạn dòng | Khoảng trống hai bên có chức năng; không tự xóa vì thấy chưa dùng hết màn hình |
| [W3C Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) | Phân biệt control và trạng thái | Đo tín hiệu cần nhận biết control; không coi tương phản đạt là chứng minh thẩm mỹ đạt |

Material 3 và Apple HIG đã được tìm thấy nhưng nội dung đầy đủ chưa đọc được qua công cụ truy xuất trong lần này. Không tính chúng là nguồn đã nghiên cứu đầy đủ. Không thể xác nhận đã tìm hết mọi kỹ năng tồn tại trên Internet.

## Cách kiểm tra thay đổi này

1. Xem màn có dữ liệu tại đầu trang và khi cuộn, không chỉ DOM.
2. Tại 1440px và 1920px, xác minh đúng viewport, khung bảng, khoảng trống hai bên, chiều cao và trục cột.
3. Thử tìm không dấu, xóa lọc và focus bằng bàn phím bằng dữ liệu có sẵn. Không lưu hồ sơ thật.
4. Kiểm tra build, phiên bản Production và ảnh minh chứng. Khôi phục viewport sau kiểm tra.
5. Tách kết quả kỹ thuật, nhận định thị giác của AI và phản hồi nghiệm thu của anh.
