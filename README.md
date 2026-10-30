# MUSE STORE

Website thương mại điện tử thời trang nữ và mỹ phẩm, xây dựng bằng React, TypeScript, Vite, Motion và Supabase. Giao diện khách hàng và khu quản trị nằm trong cùng ứng dụng nhưng dùng đường dẫn và quyền truy cập riêng.

## Chạy dự án

Yêu cầu Node.js 20.19+ hoặc 22.12+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Trên PowerShell, dùng `Copy-Item .env.example .env.local` thay cho `cp`. Mở địa chỉ Vite in ra trong terminal (thường là `http://localhost:5173`). `npm run build` kiểm tra TypeScript và tạo bản production trong `dist/`; `npm run preview` xem bản build.

Nếu chưa cấu hình Supabase, cửa hàng hiển thị 24 sản phẩm xem trước. Dữ liệu xem trước chỉ giúp kiểm tra giao diện: đăng nhập Admin và đặt hàng sẽ chưa hoạt động. Sau khi điền biến môi trường, ứng dụng chỉ đọc sản phẩm trực tiếp từ Supabase; không dùng dữ liệu xem trước để thay thế khi truy vấn database lỗi.

## Thiết lập Supabase

1. Tạo một dự án Supabase. Trong **Project Settings → API**, lấy **Project URL** và **anon/publishable key**. Điền vào `.env.local`:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
   ```

   Chỉ dùng key công khai trong frontend. Không đưa `service_role` hoặc secret key vào `VITE_*`, source code hoặc Git.

2. Trong SQL Editor của chính dự án, chạy toàn bộ [migration](supabase/migrations/202610300001_initial.sql). Migration tạo bảng, bucket `muse-assets`, RLS, chính sách Storage, hàm đặt hàng có kiểm tra tồn kho tại database và trigger hoàn kho khi hủy đơn.
3. Chạy [seed](supabase/seed.sql) trong SQL Editor. Seed tạo 14 danh mục, 12 sản phẩm thời trang, 12 mỹ phẩm, ảnh riêng cho từng sản phẩm, banner và nội dung mặc định. Chạy lại seed sẽ bỏ qua bản ghi đã tồn tại, nên các chỉnh sửa của Admin không bị ghi đè.
4. Trong **Authentication → Users**, tạo tài khoản bằng email và mật khẩu mạnh. Không có form đăng ký Admin công khai.
5. Trong SQL Editor, cấp quyền Admin cho đúng tài khoản vừa tạo. Thay email mẫu bằng email thực tế:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'admin@example.com');
   ```

   Nếu tài khoản được tạo trước khi chạy migration, trigger chưa tạo hồ sơ. Tạo hồ sơ từ SQL Editor rồi cấp quyền:

   ```sql
   insert into public.profiles (id, email, role)
   select id, email, 'admin' from auth.users where email = 'admin@example.com'
   on conflict (id) do update set role = 'admin';
   ```

   Kiểm tra kết quả bằng `select email, role from public.profiles where email = 'admin@example.com';`. Chỉ người có quyền trong SQL Editor hoặc service role phía server mới thực hiện được thao tác này. Người dùng thường không thể tự nâng quyền bằng API.

6. Khởi động lại Vite sau khi đổi `.env.local` để nhận biến môi trường mới. Truy cập `/admin/login` và đăng nhập bằng email, mật khẩu đã tạo.

### Quản trị sản phẩm

Tại `/admin`, chọn **Thêm sản phẩm**. Điền thông tin, chọn loại sản phẩm và danh mục tương ứng, thêm giá và tồn kho. Có thể chọn nhiều ảnh JPG, PNG, WebP hoặc AVIF (mỗi ảnh tối đa 10 MB), chọn ảnh đại diện, xem trước và **Đăng sản phẩm**. Ảnh được lưu trong Supabase Storage; thông tin sản phẩm và quan hệ ảnh nằm trong PostgreSQL. Sản phẩm xuất hiện trên cửa hàng khi trạng thái là **Đang hiển thị**. Nút **Lưu nháp** giữ sản phẩm khỏi trang khách hàng.

Các trang quản trị khác cho phép sửa/ẩn/xóa sản phẩm, điều chỉnh tồn kho, quản lý danh mục, cập nhật trạng thái đơn hàng, xem khách hàng đã có tài khoản và sửa nội dung website/banner. Trong **Website & banner**, Admin có thể tải ảnh hero mới và thay nội dung quảng bá; ảnh được lưu trên Supabase Storage. Dashboard tính số liệu từ các bản ghi hiện có.

### Đặt hàng và bảo mật

Giỏ hàng và danh sách yêu thích được lưu trên trình duyệt để dùng tiếp sau khi tải lại. Khi khách đặt hàng, hàm `place_order` trong database xác minh giá và tồn kho, khóa từng sản phẩm để tránh bán vượt số lượng, rồi ghi đơn và trừ tồn kho trong một giao dịch. Không có thanh toán trực tuyến trong dự án này; đơn được ghi ở trạng thái **Chờ xác nhận** để Admin xử lý. Hủy đơn sẽ cộng lại tồn kho.

RLS chỉ cho khách xem sản phẩm đã xuất bản. Thao tác quản trị yêu cầu phiên đăng nhập hợp lệ và quyền Admin được kiểm tra trong PostgreSQL, không dựa vào việc ẩn nút trên frontend. Cấu hình Site URL và Redirect URLs của Supabase Auth theo tên miền triển khai thực tế.

Trước khi mở đặt hàng công khai với lưu lượng lớn, nên bổ sung giới hạn tần suất và biện pháp chống spam cho hàm đặt hàng ẩn danh. Dự án chưa tích hợp thanh toán trực tuyến.

## Triển khai

Đây là ứng dụng Vite tĩnh. Có thể triển khai lên Vercel, Netlify hoặc nền tảng phục vụ tệp tĩnh khác:

- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Bật chuyển mọi đường dẫn ứng dụng về `index.html` để các trang như `/san-pham/...` và `/admin/login` mở trực tiếp được. Dự án có sẵn `vercel.json` và `public/_redirects` cho Vercel/Netlify.

Sau khi triển khai, cập nhật **Site URL** và **Redirect URLs** trong Supabase Authentication theo domain thật. Không cần cài database trên nền tảng frontend; website dùng dự án Supabase đã tạo.

## Cấu trúc

```text
src/
  admin/       giao diện và luồng quản trị
  components/  header, footer, thẻ sản phẩm
  contexts/    catalog, giỏ hàng, yêu thích, toast
  data/        dữ liệu xem trước khi chưa cấu hình
  hooks/       đọc nội dung website
  layouts/     bố cục cửa hàng
  pages/       các trang khách hàng
  services/    truy vấn Supabase và thao tác nghiệp vụ
  types/       kiểu dữ liệu
  utils/       định dạng tiền và tiện ích
supabase/
  migrations/  schema, RLS, Storage, RPC
  seed.sql     24 sản phẩm và nội dung ban đầu
public/        ảnh chiến dịch, favicon và cấu hình SPA
```

Ảnh chiến dịch trong `public/` được tạo riêng cho giao diện MUSE STORE. Ảnh sản phẩm mẫu dùng URL ảnh riêng; sản phẩm Admin tải lên sẽ dùng Supabase Storage.

## Kiểm tra

```bash
npm run typecheck
npm run build
npm run smoke
```

Chạy `npm run smoke` khi dev server đang mở ở `http://127.0.0.1:5173`. Kiểm tra dùng Edge trên Windows; trên hệ khác, đặt `MUSE_BROWSER_PATH` thành đường dẫn Chromium phù hợp. Có thể chỉ định URL khác bằng `node scripts/browser-smoke.mjs http://127.0.0.1:4173`. Smoke test kiểm tra các trang chính, bộ lọc, tìm kiếm, chi tiết, giỏ hàng lưu qua reload, chặn checkout khi chưa có Supabase, quyền Admin và menu di động.

Sau khi nối Supabase, cần kiểm tra thủ công trên dự án thật: đăng nhập Admin và truy cập trái phép, thêm/sửa/ẩn/xóa sản phẩm, tải nhiều ảnh, đặt hàng với tồn kho đủ và thiếu, hủy đơn để hoàn kho, cùng giao diện trên desktop và điện thoại. Các luồng Supabase thật chưa thể kiểm thử nếu chưa có URL/key và migration được chạy.

Tài liệu chính thức: [Vite](https://vite.dev/guide/), [Supabase React](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [React Router SPA](https://reactrouter.com/how-to/spa), [Netlify redirects](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/) và [Vercel rewrites](https://vercel.com/kb/guide/why-is-my-deployed-project-giving-404).
