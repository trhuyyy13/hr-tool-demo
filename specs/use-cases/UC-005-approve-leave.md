# UC-005: Duyệt/từ chối nghỉ phép

## Metadata
- **ID:** UC-005
- **Liên quan tới BR:** BR-001
- **Status:** approved
- **Owner:** Diệp

## Actor
Manager (đã login)

## Mô tả ngắn
Manager xem yêu cầu nghỉ phép của nhân viên dưới quyền, duyệt hoặc từ chối
kèm lý do.

## Trigger
Manager mở link duyệt trong email UC-004 gửi (hoặc trang danh sách yêu cầu
chờ duyệt), chọn 1 `LeaveRequest` đang `pending`.

## Preconditions
- Manager đã login (UC-001).
- Manager là `manager_id` trực tiếp của Employee gửi yêu cầu — **trừ khi
  Employee không có manager** (`manager_id = null`, ví dụ nhân viên đứng
  đầu tổ chức), trường hợp đó HR Director là người duyệt thay (xem E5).

## Main Flow (Duyệt)
1. Manager xem chi tiết yêu cầu (nhân viên, loại nghỉ, from/to date, lý do,
   status hiện tại).
2. Manager bấm "Duyệt".
3. Hệ thống kiểm tra quyền (Manager đúng là quản lý trực tiếp) và trạng
   thái (`status = "pending"`).
4. Hệ thống cập nhật `LeaveRequest`: `status = "approved"`,
   `approver_id`, `approved_at`.
5. Nếu `type = "annual"`: trừ `annual_leave_balance` của Employee theo số
   business day của yêu cầu.
6. Hệ thống ghi `ApprovalLog` (`from_status = "pending"`,
   `to_status = "approved"`, `changed_by` = Manager).
7. Hệ thống hiển thị kết quả đã duyệt.

## Alternative Flows

### A1: Từ chối
**Trigger:** thay bước 2-7 Main Flow
**Flow:**
1. Manager bấm "Từ chối", nhập lý do từ chối.
2. Hệ thống kiểm tra quyền, trạng thái, và lý do không rỗng.
3. Hệ thống cập nhật `LeaveRequest`: `status = "rejected"`,
   `approver_id`, `approved_at`, `reject_reason`.
4. Hệ thống ghi `ApprovalLog` (`to_status = "rejected"`).
5. Hệ thống hiển thị kết quả đã từ chối. `annual_leave_balance` KHÔNG đổi.
6. Use case ends.

## Exceptions
- **E1.** Người thao tác không phải `manager_id` trực tiếp của Employee:
  reject (403), hiển thị "Bạn không có quyền duyệt yêu cầu này".
- **E2.** `LeaveRequest` không tồn tại hoặc không còn ở trạng thái
  `pending` (đã được xử lý/huỷ trước đó): reject, hiển thị "Yêu cầu không
  tồn tại hoặc đã được xử lý".
- **E3.** Từ chối nhưng không nhập lý do: reject, hiển thị "Cần nhập lý do
  từ chối".
- **E4.** Duyệt `type = "annual"` nhưng `annual_leave_balance` hiện tại
  không đủ (có thể đã bị trừ bởi một `LeaveRequest` khác được duyệt sau
  khi request này được gửi): reject, hiển thị "Số ngày phép còn lại: X".
- **E5.** Employee gửi yêu cầu không có `manager_id` (đứng đầu tổ chức):
  **HR Director** — một Employee cố định do demo cấu hình
  (`HR_DIRECTOR_EMAIL`) — được coi là người có quyền duyệt/từ chối thay
  cho vị trí "manager trực tiếp" ở E1. UC-004 cũng dùng cùng fallback này
  để biết gửi email duyệt tới ai khi Employee không có manager.

## Acceptance Criteria

### AC-1: Duyệt yêu cầu annual hợp lệ
**Given:** Employee có 8 ngày phép, `LeaveRequest` pending 3 business day
(annual), Manager đúng là quản lý trực tiếp
**When:** Manager bấm "Duyệt"
**Then:** `status = "approved"`, `approver_id` = Manager, `annual_leave_balance`
giảm còn 5
**And:** tạo `ApprovalLog` (`pending` → `approved`)

### AC-2: Duyệt yêu cầu sick — không trừ balance
**Given:** `LeaveRequest` pending (sick), Employee có 0 ngày phép annual
**When:** Manager bấm "Duyệt"
**Then:** `status = "approved"`, `annual_leave_balance` KHÔNG đổi

### AC-3: Từ chối kèm lý do
**Given:** `LeaveRequest` đang pending
**When:** Manager từ chối với lý do "Trùng lịch dự án"
**Then:** `status = "rejected"`, `reject_reason = "Trùng lịch dự án"`
**And:** `annual_leave_balance` KHÔNG đổi

### AC-4: Từ chối thiếu lý do
**Given:** `LeaveRequest` đang pending
**When:** Manager bấm "Từ chối" mà không nhập lý do
**Then:** reject với message "Cần nhập lý do từ chối"
**And:** `status` vẫn là `pending`

### AC-5: Người không phải quản lý trực tiếp không được duyệt
**Given:** `LeaveRequest` của Employee A, người thao tác không phải
`manager_id` của A
**When:** người đó bấm "Duyệt" hoặc "Từ chối"
**Then:** reject (403) với message "Bạn không có quyền duyệt yêu cầu này"

### AC-6: Yêu cầu đã được xử lý rồi
**Given:** `LeaveRequest` đã có `status = "approved"`
**When:** Manager bấm "Duyệt" (hoặc "Từ chối") lần nữa
**Then:** reject với message "Yêu cầu không tồn tại hoặc đã được xử lý"

### AC-7: Duyệt annual vượt quá balance hiện tại
**Given:** Employee còn 2 ngày phép, `LeaveRequest` pending cần 3 business
day (annual)
**When:** Manager bấm "Duyệt"
**Then:** reject với message "Số ngày phép còn lại: 2"
**And:** `status` vẫn là `pending`

### AC-8: HR Director duyệt thay khi Employee không có manager
**Given:** Employee không có `manager_id` (đứng đầu tổ chức), có
`LeaveRequest` đang pending
**When:** HR Director bấm "Duyệt"
**Then:** `status = "approved"`, `approver_id` = HR Director — giống hệt
AC-1, chỉ khác người duyệt

## Business Rules
- **HR Director** (E5): demo dùng 1 Employee cố định, xác định qua env
  `HR_DIRECTOR_EMAIL` (mặc định `ha.pham@company.com`, seed sẵn) — đứng
  vai người duyệt/nhận email khi Employee không có manager. Đây là fix
  phát sinh từ thực tế vận hành (nhân viên đứng đầu tổ chức không có ai
  duyệt hộ), không phải rule đã tính trước từ ngày viết spec đầu tiên.

## History
- v1 (2026-08-06, Diệp): stub từ `/specify`
- v2 (2026-08-08, Diệp): elaboration đầy đủ — Trigger/Main Flow/Alternative
  Flows/Exceptions/Acceptance Criteria, cùng format đã chốt ở
  UC-001/UC-002/UC-004
- v3 (2026-08-08, Diệp): thêm E5/AC-8 — HR Director duyệt thay khi
  Employee không có manager (`manager_id = null`); phát hiện khi đối
  chiếu lại với case study gốc, chưa từng test tới trước đó
