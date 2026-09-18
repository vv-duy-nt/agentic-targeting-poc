# AI Customer Targeting PoC

Demo local cho luồng AI hỗ trợ chọn nhóm khách hàng marketing: người dùng nhập yêu cầu tiếng Việt, agent sinh SQL an toàn, lấy customer segment từ PostgreSQL, chọn sản phẩm và lấy ảnh từ MinIO.

```text
Prompt → Gemini Agent → SQL Validator → PostgreSQL (read-only)
       → Customer Segment → Product Recommendation → MinIO image → Web trace
```

PoC mô phỏng kiến trúc BigQuery/Cloud Storage bằng PostgreSQL/MinIO để chạy được trên máy local. AI không có credential database và mọi SQL phải qua lớp validator trước khi chạy.

## Cấu trúc source

```text
apps/
  agent-api/       Fastify API: metadata, product, SQL validation/execution
  web/             Next.js demo UI (giai đoạn sau)
packages/
  shared/          Types, Zod schemas, constants dùng chung
  database/        Admin/agent DB pools, metadata, product repository
  storage/         MinIO adapter
  sql-validator/   PostgreSQL AST parser và security rules
  providers/       Gemini/provider abstraction, JSON/Zod response boundary
  tools/           Tool boundary cho agent (giai đoạn sau)
  agent/           Agent workflow/orchestration (giai đoạn sau)
infra/postgres/    Schema, roles và bootstrap SQL
scripts/           Seed DB, seed storage, query verify
demo-data/         Data/asset demo; Git chỉ giữ asset mẫu
docs/              Plan, progress, kiến trúc và build guide
```

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
4. Seed data và MinIO assets: hoàn thành — bucket `marketing-assets` nhận ảnh product/coupon/banner từ `demo-data/images`.
5. Shared contracts và database package: hoàn thành — Zod contracts, metadata tools, product repository, admin/agent read-only pools.
6. Read-only API foundation: hoàn thành — health, schema metadata và product endpoints đã verify qua HTTP.
7. SQL security boundary: hoàn thành — PostgreSQL AST parser, SELECT-only validation, consent/LIMIT/table whitelist và execution bằng `agent_reader`.
8. AI provider abstraction: hoàn thành — Gemini/OpenAI-compatible factory, structured JSON parse và Zod validation; key chỉ được yêu cầu khi gọi provider.
9. Natural Language → SQL: hoàn thành — nhận prompt Việt/English/日本語, dùng schema thật, sinh SQL rồi local-validate; endpoint này không execute query.
10. Tool layer: hoàn thành — registry Zod cho schema/SQL/product/image; SQL execution luôn re-validate và dùng `agent_reader`.
11. Deterministic agent workflow: hoàn thành — `POST /agent/run` trả segment, SQL, validation, product, image URL và trace.
12. Web demo: hoàn thành — giao diện bảng kết quả gọi `/agent/run`, có prompt mẫu Việt/Anh/Nhật, SQL/rules, segment, product ảnh và trace.
13. Các bước sau: automated tests, demo handoff và mở rộng chat UI.

## Lệnh hữu ích

```bash
pnpm infra:up      # khởi động PostgreSQL, Adminer, MinIO
pnpm infra:down    # dừng hạ tầng, giữ dữ liệu local
pnpm db:seed       # reset và tạo dữ liệu demo PostgreSQL
pnpm storage:seed  # tạo bucket và upload assets MinIO
pnpm typecheck     # kiểm tra TypeScript toàn workspace
pnpm --filter @app/agent-api dev  # chạy read-only API tại localhost:3001
pnpm --filter @app/web dev        # chạy web demo tại localhost:3000
docker compose ps  # trạng thái container
```

Web demo mặc định gọi `http://localhost:3001`. Nếu API chạy ở host/port khác, đặt `NEXT_PUBLIC_AGENT_API_URL` trong `apps/web/.env.local` rồi restart Next.js.

## Cấu hình AI provider

Provider và các endpoint AI đã sẵn sàng. Key/model dùng tên biến chung, không gắn cứng theo hãng. Điền trong `.env` (không commit file này):

```env
AI_PROVIDER=gemini
AI_API_KEY=your_key
AI_MODEL=gemini-3.6-flash
```

Với OpenAI, Groq, OpenRouter hoặc API tương thích OpenAI:

```env
AI_PROVIDER=openai-compatible
AI_API_KEY=your_key
AI_MODEL=provider_model_name
AI_BASE_URL=https://provider.example/v1
```

Thiếu `AI_API_KEY` không làm API metadata hiện tại dừng; chỉ lỗi cấu hình an toàn khi code khởi tạo provider. Claude và các giao thức khác sẽ có adapter riêng nhưng vẫn dùng `AI_API_KEY` và `AI_MODEL`.

## API đã có

| Endpoint | Mục đích |
|---|---|
| `GET /health` | Kiểm tra API hoạt động |
| `GET /tables`, `GET /schema` | Xem metadata database whitelist |
| `GET /products` | Đọc product bằng role agent read-only |
| `POST /sql/validate` | Kiểm tra SQL AI sinh ra |
| `POST /sql/execute` | Validate lại rồi chạy SELECT bằng `agent_reader` |
| `POST /sql/generate` | Prompt Việt/English/日本語 → SQL + validator result; không execute SQL |
| `POST /agent/run` | Luồng end-to-end read-only: prompt → segment → product → image → trace |

`POST /sql/generate` chỉ retry một lần khi model trả JSON sai contract. Lỗi cấu hình AI, provider hoặc response dùng mã riêng (`AI_CONFIGURATION_ERROR`, `AI_PROVIDER_ERROR`, `AI_RESPONSE_ERROR`) và không trả secret ra client.


Không commit `.env` hoặc bất kỳ API key/password nào.
