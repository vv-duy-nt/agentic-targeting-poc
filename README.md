# AI Customer Targeting PoC

Demo local cho luồng AI hỗ trợ chọn nhóm khách hàng marketing: người dùng nhập yêu cầu tiếng Việt, agent sinh SQL an toàn, lấy customer segment từ PostgreSQL, chọn sản phẩm và lấy ảnh từ MinIO.

```text
Prompt → Gemini Agent → SQL Validator → PostgreSQL (read-only)
       → Customer Segment → Product Recommendation → MinIO image → Web trace
```

PoC mô phỏng kiến trúc BigQuery/Cloud Storage bằng PostgreSQL/MinIO để chạy được trên máy local. AI không có credential database và mọi SQL phải qua lớp validator trước khi chạy.

## Điều kiện cần

- Node.js 22+
- pnpm
- Docker Desktop hoặc Docker Engine có Docker Compose
- Gemini API key (chỉ cần từ phase AI trở đi)

## Khởi động

```bash
cp .env.example .env
pnpm install
pnpm infra:up
docker compose ps
```

Đặt giá trị riêng trong `.env` cho password database và MinIO trước lần khởi động đầu tiên. Nếu thay đổi các biến khởi tạo `POSTGRES_*` hoặc `MINIO_*` sau đó, reset dữ liệu local bằng `docker compose down -v`, rồi chạy lại `pnpm infra:up`.

## Service URLs

| Service | URL | Mục đích |
|---|---|---|
| Adminer | http://localhost:8080 | Giao diện PostgreSQL |
| MinIO Console | http://localhost:9001 | Giao diện object storage |
| PostgreSQL | `localhost:5432` | Kết nối từ DB client, không mở bằng browser |

Adminer: chọn **PostgreSQL**, server `postgres`, rồi dùng `POSTGRES_ADMIN_USER`, `POSTGRES_ADMIN_PASSWORD`, `POSTGRES_DB` trong `.env`.

MinIO: dùng `MINIO_ACCESS_KEY` và `MINIO_SECRET_KEY` trong `.env`.

## Các phase hiện tại

1. Workspace TypeScript/pnpm: hoàn thành.
2. Docker infrastructure: hoàn thành.
3. Database schema và quyền: hoàn thành — có năm bảng demo, indexes, `admin_user` và `agent_reader` chỉ-đọc.
4. Các bước sau: seed data, MinIO assets, backend API, SQL validator, Gemini agent và web demo.

## Lệnh hữu ích

```bash
pnpm infra:up      # khởi động PostgreSQL, Adminer, MinIO
pnpm infra:down    # dừng hạ tầng, giữ dữ liệu local
pnpm typecheck     # kiểm tra TypeScript toàn workspace
docker compose ps  # trạng thái container
```

Không commit `.env` hoặc bất kỳ API key/password nào.
