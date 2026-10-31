# Cập nhật màu, size và ảnh theo màu

## Website đã có dữ liệu

1. Mở đúng dự án Supabase mà website hiện tại đang sử dụng.
2. Vào SQL Editor, chạy toàn bộ file [202610310001_product_variants.sql](migrations/202610310001_product_variants.sql) một lần. Nếu dùng Supabase CLI có lịch sử migration đồng bộ, áp dụng migration mới theo quy trình hiện tại của dự án.
3. Chạy `npm run build`, sau đó triển khai code mới lên nền tảng đang dùng. Giữ nguyên biến môi trường URL/key Supabase. Không có thư viện ứng dụng mới nên không cần cài lại dependencies.
4. Vào admin, mở một sản phẩm cũ. Sản phẩm vẫn giữ ảnh và tồn kho chung. Khi sẵn sàng chuyển sang tồn kho riêng, bật **Quản lý tồn kho theo màu và size**, nhập số lượng thực tế cho toàn bộ các ô rồi lưu. Nhập 0 cho tổ hợp hết hàng.
5. Kiểm tra trên trang khách: chọn màu, chọn size, thêm giỏ và đặt một đơn thử. Hủy đơn trong admin để kiểm tra hoàn kho.

Không chạy lại migration khởi tạo, không reset database, không tạo dự án Supabase mới và không chạy seed khi cập nhật. Migration mới không xóa sản phẩm hoặc đơn hàng. Phải chạy migration mới trước khi triển khai frontend vì admin mới gọi RPC và các cột mới.

## Cách sử dụng

- Thêm màu và size bằng nút **Thêm** hoặc Enter; dấu phẩy cho phép nhập nhiều tên. Ví dụ Đen, Trắng, Kem và S, M, L tạo bảng 9 ô.
- Tải ảnh vào từng nhóm màu hoặc dùng **Gán màu cho ảnh** để phân loại ảnh cũ. Mỗi màu có thể có nhiều ảnh và một ảnh chính. **Đại diện cửa hàng** là ảnh dùng cho danh sách sản phẩm. Tối đa 12 ảnh mỗi sản phẩm, mỗi ảnh tối đa 10 MB, định dạng JPG/PNG/WebP/AVIF.
- Nếu một màu chưa có ảnh, trang khách dùng ảnh chung, sau đó ảnh sản phẩm hiện có làm dự phòng.
- Xóa màu chuyển ảnh của màu đó sang nhóm ảnh chung. Các biến thể bị bỏ được ngừng bán, giữ mã cũ cho đơn hàng. Khi thêm lại đúng màu–size, hệ thống sử dụng lại mã biến thể.
- Sản phẩm đã chuyển sang tồn kho riêng được sửa số lượng trong bảng màu–size. Trang tổng quan tồn kho dẫn đến trang sửa sản phẩm để tránh ghi đè tổng số lượng.
- Nếu có khách đặt hàng hoặc admin khác lưu khi bạn đang sửa, thao tác lưu sẽ báo dữ liệu đã thay đổi. Tải lại trang rồi sửa trên số lượng mới nhất.

### Nhập trực tiếp số lượng từng màu

Chạy thêm migration [202610310003_color_quantities.sql](migrations/202610310003_color_quantities.sql) trước khi triển khai code mới. Migration thêm chế độ số lượng theo màu, giữ nguyên sản phẩm và số lượng đã có.

Trong admin, chọn **Quản lý số lượng → Theo màu — nhập số lượng từng màu**. Ví dụ sản phẩm A có Đen 2 cái, Trắng 1 cái: nhập 2 và 1 vào hai ô tương ứng rồi nhấn Lưu. Với sản phẩm cũ, ô số lượng từng màu hiển thị ngay; sửa ô rồi nhấn Lưu sẽ tự bật quản lý kho theo màu. Nếu sản phẩm cũ chỉ có một màu và chưa phân bổ biến thể, ô đó hiển thị số lượng kho hiện có; nhiều màu thì cần nhập từng màu. Mở rồi lưu mà không sửa số lượng không tự chuyển đổi kho.

Bạn vẫn có thể khai báo S, M, L; tất cả size của cùng màu dùng chung số lượng của màu đó. Khách mua Đen–S hoặc Đen–M đều trừ vào 2 cái màu Đen. Tổng kho là 3 cái.

Sản phẩm mới mặc định dùng chế độ này. Sản phẩm cũ đang quản lý từng màu–size giữ chế độ cũ; có thể chuyển sang Theo màu, kiểm tra số lượng mỗi màu rồi lưu. Hệ thống không tự chia số lượng màu cho từng size. Nếu cần theo dõi số lượng thực tế từng size, chọn **Theo từng màu và size** và nhập bảng chi tiết.

## Dữ liệu và đơn hàng cũ

`products.variant_mode` mặc định là `legacy`. Migration không tự chia tồn kho vì không thể suy ra số lượng thực tế của từng màu–size. Sản phẩm chưa có bản ghi biến thể tiếp tục dùng danh sách màu/size hiện có và tồn kho chung. Nếu trước đây đã có bản ghi biến thể, các tổ hợp hiện có vẫn được kiểm tra; tồn kho null tiếp tục dùng hạn mức chung.

Khi admin cung cấp đủ bảng tồn kho, RPC chuyển sản phẩm sang `tracked` và tổng kho bằng tổng các biến thể đang bán. Không thể chuyển ngược về kho chung. Đặt hàng khóa sản phẩm và biến thể trong giao dịch, dùng giá database, lưu đúng màu/size và ảnh. Các giao dịch lấy khóa sản phẩm theo cùng thứ tự để giảm nguy cơ khóa chéo.

Hủy đơn hoàn số lượng về đúng biến thể. Biến thể đã ngừng bán nhận lại kho trong bản ghi cũ nhưng không tăng kho đang bán. Với đơn đặt trước khi chuyển đổi, hệ thống tìm cặp màu–size cũ; nếu cặp đó không còn trong danh mục, tạo bản ghi ngừng bán để giữ số lượng hoàn. Sản phẩm mỹ phẩm không có biến thể tiếp tục dùng tồn kho chung.

Khi bỏ ảnh khỏi sản phẩm, RPC xóa liên kết ảnh nhưng giữ tệp Storage để ảnh của đơn hàng cũ vẫn truy cập được. Tệp này không bị tự động xóa khi lưu sản phẩm.

## Kiểm tra tự động

`npm run build` kiểm tra TypeScript và tạo bản production.

Các kiểm tra biến thể chạy trên PostgreSQL WASM tạm; chúng không kết nối hoặc thay đổi Supabase thật. Cài công cụ QA vào thư mục đã được Git bỏ qua, không thêm dependency của website:

```bash
npm install --prefix node_modules/.variant-qa --no-save --package-lock=false @electric-sql/pglite
node scripts/variants-db-test.mjs
node scripts/variants-browser-test.mjs
```

Kiểm tra trình duyệt dùng Edge trên Windows; có thể đặt `MUSE_BROWSER_PATH` thành đường dẫn Chromium khác. Script tự mở Vite ở cổng 5417 rồi dừng khi hoàn tất. Auth, HTTP và Storage được mô phỏng; các RPC lưu sản phẩm, đặt hàng và hủy đơn chạy SQL thật trên database thử. Kiểm tra hai yêu cầu mua đơn vị cuối dùng một kết nối PostgreSQL WASM được tuần tự hóa; chưa phải kiểm thử tải với nhiều kết nối database.

Phạm vi kiểm tra: tạo 3×3 biến thể, ảnh chính theo màu, lưu/mở lại admin, giao diện mobile, màu/size trùng, tồn kho âm/thiếu, tổ hợp không tồn tại, giỏ hàng/ảnh đúng màu, đặt và hủy đơn, rollback nhiều dòng hàng, sản phẩm cũ, mỹ phẩm, xóa/thêm lại màu, xung đột khi lưu và quyền RPC. Cần xác nhận Auth/Storage và luồng mua hàng trên Supabase thật sau khi triển khai.
