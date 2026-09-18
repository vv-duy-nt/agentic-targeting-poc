# AI Customer Targeting PoC — Tiến độ công khai

> Bảng theo dõi rút gọn cho mục đích review và demo.

## Quy ước trạng thái

- `[ ]` Chưa bắt đầu
- `[/]` Đang thực hiện
- `[x]` Hoàn thành và đã kiểm tra
- `[!]` Cần quyết định hoặc đang bị chặn

## Tổng quan

| Hạng mục | Trạng thái | Kết quả chính |
|---|---|---|
| Nền tảng local và dữ liệu demo | `[x]` | Docker Compose, PostgreSQL, MinIO, seed data và role read-only |
| API metadata và dữ liệu | `[x]` | Health, schema và product endpoints |
| SQL safety boundary | `[x]` | SELECT-only, allowlist, LIMIT, consent và execution read-only |
| AI provider và Natural Language → SQL | `[x]` | Gemini/provider abstraction, structured JSON và validation |
| Agent workflow end-to-end | `[x]` | Segment, product, image URL và execution trace |
| Web demo | `[x]` | UI gọi agent workflow, hiển thị kết quả và trace |
| Automated tests và demo handoff | `[/]` | Cần bổ sung coverage và hoàn thiện tài liệu demo |

## Các mốc đã hoàn thành

### 1. Infrastructure và data `[x]`

- Workspace Node.js/TypeScript và Docker Compose hoạt động local.
- PostgreSQL có dữ liệu khách hàng, sản phẩm, purchase và marketing consent.
- MinIO lưu assets demo; `agent_reader` chỉ được phép `SELECT`.

### 2. SQL security `[x]`

- Chặn các câu lệnh ghi/thay đổi schema.
- Bắt buộc dùng bảng trong allowlist, có `LIMIT` và điều kiện consent khi targeting customer.
- SQL chỉ được thực thi sau validation bằng role read-only.

### 3. AI workflow `[x]`

- Provider nhận schema allowlist, safety rules và user prompt; không nhận credential.
- Response được ép theo JSON/Zod contract và SQL được validate tại backend.
- Workflow trả segment, product recommendation, MinIO image URL và trace nghiệp vụ.

### 4. Web demo `[x]`

- UI hỗ trợ prompt mẫu Việt/Anh/Nhật.
- Hiển thị SQL, validation rules, danh sách khách hàng, sản phẩm/ảnh và trace.

## Việc tiếp theo

- [ ] Thêm unit/integration tests cho các nhánh validator, provider error và agent workflow.
- [ ] Rà soát lại demo scenarios và chuẩn bị kịch bản trình bày ngắn.
- [ ] Hoàn thiện tài liệu chạy demo/handoff cho người review.
- [ ] Đánh giá provider/model phù hợp sau khi có kết quả test và feedback demo.

## Tiêu chí sẵn sàng demo

- [x] Hệ thống local chạy được bằng hướng dẫn trong README.
- [x] Prompt hợp lệ trả về segment qua read-only workflow.
- [x] SQL nguy hiểm hoặc không đúng rule bị chặn trước execution.
- [x] UI hiển thị được kết quả và trace.
- [ ] Bộ test và demo handoff được hoàn thiện.
