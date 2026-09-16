# Demo assets

Repository chỉ giữ một ảnh mẫu: `products/electronics-10.png`, để Git repository nhẹ.

## Thêm ảnh product

1. Đặt ảnh vào `products/`.
2. Đặt tên file đúng với `products.image_key` trong PostgreSQL. Ví dụ product electronics #10 dùng:

   ```text
   products/electronics-10.png
   ```

3. Upload toàn bộ asset local lên MinIO:

   ```bash
   pnpm storage:seed
   ```

4. Mở MinIO Console tại `http://localhost:9001`, bucket `marketing-assets`, để kiểm tra object đã có.

## Coupon và banner

- Coupon: đặt trong `coupons/`, ví dụ `coupons/electronics-10.png`.
- Banner: đặt trong `banners/`, ví dụ `banners/electronics-campaign.png`.

Database chỉ lưu object key, không lưu URL. Khi thêm ảnh mới, đảm bảo object key trong database trùng chính xác với path tương đối bên trong `demo-data/images/`.
