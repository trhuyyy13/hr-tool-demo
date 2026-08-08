# UC-006: Báo cáo tháng

## Metadata
- **ID:** UC-006
- **Liên quan tới BR:** BR-001
- **Status:** approved
- **Owner:** Diệp

## Actor
HR (đã login)

## Mô tả ngắn
HR xuất báo cáo tổng hợp công/ngày nghỉ theo tháng dạng CSV, thay cho việc
tổng hợp thủ công từ Excel.

## Trigger
HR mở trang Báo cáo tháng, chọn tháng/năm, bấm "Xuất CSV".

## Preconditions
- HR đã login (UC-001).
- **Demo scope:** entity model chưa có cột "role" phân biệt HR/Manager/
  Employee (xem [entity-model.md](../entities/entity-model.md#employee)) —
  giống cách UC-001 dùng picker thay Google OAuth thật, MVP này cho phép
  bất kỳ Employee đã login nào gọi được báo cáo, không phân quyền theo
  role. Việc phân quyền HR-only là công việc của một UC "quản lý vai trò"
  chưa nằm trong 5 UC đã chốt Ngày 01 — cần Employee bổ sung cột `role`
  trước khi thêm.

## Main Flow
1. HR chọn tháng, năm.
2. HR bấm "Xuất CSV".
3. Hệ thống tổng hợp `Attendance` + `LeaveRequest` (status = `"approved"`)
   trong khoảng thời gian của tháng, theo từng `Employee`:
   - `work_days` — số ngày có `check_in_at` trong tháng
   - `leave_days` — tổng business day của các `LeaveRequest` approved,
     phần giao với tháng được chọn
   - `late_minutes` — tổng số phút `check_in_at` trễ sau 09:00 (giờ Việt
     Nam) trong tháng
4. Hệ thống trả về file CSV: `employee_id, full_name, department,
   work_days, leave_days, late_minutes`.
5. HR tải file về.

## Exceptions
- **E1.** Tháng không hợp lệ (ngoài 1-12): reject, hiển thị "Tháng không
  hợp lệ".
- **E2.** Tháng/năm được chọn nằm trong tương lai (so với tháng hiện tại):
  reject, hiển thị "Không thể xuất báo cáo cho tháng trong tương lai".

## Acceptance Criteria

### AC-1: work_days đếm đúng số ngày có check-in
**Given:** Employee có check-in hợp lệ vào 5 ngày khác nhau trong tháng
**When:** HR xuất báo cáo tháng đó
**Then:** `work_days = 5` cho Employee này

### AC-2: leave_days cộng đúng business day của leave đã duyệt
**Given:** Employee có 1 `LeaveRequest` `type = "annual"`,
`status = "approved"`, nằm trọn trong tháng, 3 business day
**When:** HR xuất báo cáo tháng đó
**Then:** `leave_days = 3` cho Employee này

### AC-3: late_minutes cộng dồn theo phút trễ sau 09:00
**Given:** Employee check-in lúc 09:15 (trễ 15 phút) và 09:05 (trễ 5 phút)
trong tháng, các ngày khác đúng giờ
**When:** HR xuất báo cáo tháng đó
**Then:** `late_minutes = 20` cho Employee này

### AC-4: Tháng không hợp lệ
**Given:** HR chọn tháng = 13
**When:** HR bấm "Xuất CSV"
**Then:** reject với message "Tháng không hợp lệ"

### AC-5: Tháng trong tương lai
**Given:** tháng hiện tại là 2026-08
**When:** HR chọn tháng 2026-09 (tương lai) và bấm "Xuất CSV"
**Then:** reject với message "Không thể xuất báo cáo cho tháng trong
tương lai"

### AC-6: Nhân viên không có dữ liệu trong tháng
**Given:** Employee không có `Attendance` hay `LeaveRequest` approved nào
trong tháng
**When:** HR xuất báo cáo tháng đó
**Then:** `work_days = 0`, `leave_days = 0`, `late_minutes = 0` cho
Employee này (vẫn xuất hiện trong CSV, không bị bỏ qua)

## Business Rules
- Giờ bắt đầu ca làm việc (mốc tính trễ): **09:00 giờ Việt Nam** — số demo,
  chưa cấu hình được theo phòng ban/nhân viên (out of scope MVP).
- `leave_days` chỉ tính `LeaveRequest` đã `approved` — `pending`/`rejected`/
  `cancelled` không tính, khớp UC-005.

## History
- v1 (2026-08-06, Diệp): stub từ `/specify`
- v2 (2026-08-08, Diệp): elaboration đầy đủ — Trigger/Main Flow/Exceptions/
  Acceptance Criteria, cùng format đã chốt ở UC-001/UC-002/UC-005; ghi rõ
  quyết định demo "không phân quyền theo role" (chưa có cột `role` trong
  Employee)
