# UC-001: Đăng nhập bằng tài khoản công ty

## Metadata
- **ID:** UC-001
- **Liên quan tới BR:** BR-001
- **Status:** approved
- **Owner:** Tuấn

## Actor
Employee (chưa login)

## Mô tả ngắn
Nhân viên đăng nhập vào hệ thống bằng Google SSO (tài khoản công ty), không
cần tạo tài khoản/mật khẩu riêng. Đây là use case mọi UC khác đều
`<<include>>` (xem `specs/diagrams/use-cases.puml`) — thay thế header demo
`x-demo-employee-id` đang dùng tạm ở UC-004.

## Trigger
Employee mở trang login, bấm "Đăng nhập bằng Google".

## Preconditions
- Employee đã tồn tại trong hệ thống với đúng email công ty (HR tạo tài
  khoản Employee trước — việc tạo/provisioning nằm ngoài scope UC-001).
- Employee có tài khoản Google Workspace của công ty.

## Main Flow
1. Employee bấm "Đăng nhập bằng Google" trên trang login.
2. Hệ thống chuyển hướng Employee sang màn hình xác thực của Google.
3. Employee xác thực với tài khoản Google công ty.
4. Google xác nhận danh tính và trả email đã verify về cho hệ thống.
5. Hệ thống tìm Employee theo email.
6. Hệ thống tạo phiên đăng nhập và chuyển Employee vào Dashboard.

## Alternative Flows

### A1: Đã có phiên đăng nhập hợp lệ
**Trigger:** Employee mở trang login nhưng đã có session còn hạn (step 1)
**Flow:**
1. Hệ thống chuyển thẳng vào Dashboard, bỏ qua bước xác thực Google.
2. Use case ends.

## Exceptions
- **E1.** Email Google xác thực không khớp Employee nào trong hệ thống:
  reject, hiển thị "Tài khoản này chưa được cấp quyền truy cập hệ thống".
- **E2.** Employee huỷ giữa chừng ở màn hình xác thực Google: quay lại
  trang login, không tạo session.
- **E3.** Email Google trả về chưa được Google xác minh (`email_verified =
  false`): reject, hiển thị "Email chưa được xác minh, vui lòng dùng tài
  khoản Google công ty".
- **E4.** Phiên đăng nhập hết hạn khi đang dùng hệ thống: chuyển hướng về
  trang login, hiển thị "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập
  lại".

## Acceptance Criteria

### AC-1: Đăng nhập thành công với email đã đăng ký
**Given:** Google trả về email `lan.tran@company.com` (đã verify), Employee
này tồn tại trong hệ thống
**When:** Employee hoàn tất xác thực Google
**Then:** hệ thống tạo session, chuyển vào Dashboard

### AC-2: Email không tồn tại trong hệ thống
**Given:** Google trả về email `khong-ton-tai@company.com` (đã verify)
**When:** Employee hoàn tất xác thực Google
**Then:** reject với message "Tài khoản này chưa được cấp quyền truy cập
hệ thống"
**And:** KHÔNG tạo session

### AC-3: Huỷ đăng nhập giữa chừng
**Given:** Employee đang ở màn hình xác thực Google
**When:** Employee bấm huỷ / đóng cửa sổ xác thực
**Then:** quay về trang login
**And:** KHÔNG tạo session

### AC-4: Email chưa được Google xác minh
**Given:** Google trả về email với `email_verified = false`
**When:** hệ thống nhận kết quả xác thực
**Then:** reject với message "Email chưa được xác minh, vui lòng dùng tài
khoản Google công ty"

### AC-5: Truy cập lại khi đã có session hợp lệ
**Given:** Employee đã đăng nhập, session còn hạn
**When:** Employee mở lại trang login
**Then:** chuyển thẳng vào Dashboard, không hiện lại màn hình Google

### AC-6: Session hết hạn giữa phiên làm việc
**Given:** Employee đang dùng hệ thống, session đã hết hạn
**When:** Employee gọi một request bất kỳ cần đăng nhập
**Then:** chuyển hướng về trang login với message "Phiên đăng nhập đã hết
hạn, vui lòng đăng nhập lại"

## History
- v1 (2026-08-06, Tuấn): stub từ /specify
- v2 (2026-08-08, Tuấn): elaboration đầy đủ — Trigger/Main Flow/Alternative
  Flows/Exceptions/Acceptance Criteria, cùng format đã chốt ở UC-004
