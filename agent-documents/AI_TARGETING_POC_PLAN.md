# AI Customer Targeting PoC — Kế hoạch công khai

## 1. Mục tiêu

Xây dựng PoC cho phép người dùng mô tả nhóm khách hàng bằng ngôn ngữ tự nhiên. Hệ thống dùng AI để đề xuất SQL, nhưng backend luôn kiểm tra an toàn trước khi đọc dữ liệu và trả kết quả demo.

```text
Người dùng nhập yêu cầu
        ↓
AI sinh SQL có cấu trúc
        ↓
SQL Validator kiểm tra rule an toàn
        ↓
PostgreSQL read-only
        ↓
Customer segment + product + image + trace
```

## 2. Phạm vi

### Trong phạm vi

- Demo UI nhập prompt và xem kết quả.
- Natural language → SQL với Gemini là provider mặc định.
- Provider abstraction cho các API tương thích OpenAI.
- Schema allowlist, SQL validator, giới hạn số dòng và điều kiện marketing consent.
- PostgreSQL role chỉ đọc, dữ liệu demo và MinIO chứa ảnh sản phẩm.
- API trả customer segment, product recommendation, image URL và execution trace.

### Ngoài phạm vi

- Triển khai production, authentication/RBAC production, multi-tenant.
- BigQuery/GCS thật, Kubernetes, vector database, fine-tuning.
- Agent tự do truy cập shell, database hoặc internet.

## 3. Kiến trúc rút gọn

| Thành phần | Vai trò |
|---|---|
| Next.js web | Nhập prompt, hiển thị SQL, kết quả và trace |
| Fastify API | Điều phối workflow và áp rule an toàn |
| AI provider | Sinh JSON chứa intent, SQL, giải thích và bảng sử dụng |
| SQL validator | Chỉ cho phép `SELECT`, allowlist, `LIMIT`, consent |
| PostgreSQL | Lưu dữ liệu demo; agent chỉ dùng role read-only |
| MinIO | Lưu ảnh product/coupon/banner cho demo |

## 4. Các mốc thực hiện

### Mốc 1 — Nền tảng và dữ liệu

- Dựng pnpm workspace, TypeScript và Docker Compose.
- Tạo PostgreSQL, MinIO, schema, seed data và role `agent_reader` chỉ đọc.
- Hoàn thành khi môi trường local khởi động được và dữ liệu demo có thể query.

### Mốc 2 — API an toàn

- Cung cấp schema/product endpoints.
- Validate SQL: một statement, SELECT-only, table allowlist, LIMIT và marketing consent.
- Hoàn thành khi SQL hợp lệ chạy qua `agent_reader`; SQL nguy hiểm bị từ chối trước execution.

### Mốc 3 — AI và agent workflow

- Tách provider interface; Gemini là mặc định, hỗ trợ OpenAI-compatible.
- Đưa schema allowlist và business rule vào prompt, parse output bằng Zod.
- Điều phối cố định: schema → generate SQL → validate → execute → product → image → trace.
- Hoàn thành khi prompt Việt/Anh/Nhật trả kết quả đúng contract và không lộ secret.

### Mốc 4 — Demo và bàn giao

- Kết nối web UI với `POST /agent/run`.
- Hiển thị SQL, rule validation, customer segment, product, image và trace.
- Bổ sung test cho các rule quan trọng, hướng dẫn chạy và kịch bản demo.
- Hoàn thành khi demo local chạy được end-to-end và có tài liệu review.

## 5. Nguyên tắc kiểm soát

- AI chỉ đề xuất SQL; backend quyết định việc có được chạy hay không.
- Không đưa API key, password hoặc raw database records không cần thiết vào prompt.
- Mỗi thay đổi đi theo task nhỏ: đọc context liên quan → implement → review diff → verify → cập nhật progress → commit.
- Mọi task cần có acceptance criteria và bằng chứng kiểm tra trước khi đánh dấu hoàn thành.
