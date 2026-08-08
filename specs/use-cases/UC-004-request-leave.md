# UC-004: Xin nghỉ phép

## Metadata
- **ID:** UC-004
- **Liên quan tới BR:** BR-001
- **Status:** approved
- **Owner:** An

## Actor
Employee (đã login)

## Trigger
Employee bấm "Xin nghỉ phép" ở trang Dashboard

## Preconditions
- Employee đã login
- Employee có `annual_leave_balance` > 0 (cho type `"annual"`)

## Main Flow
1. Hệ thống hiển thị form: `type`, `from_date`, `to_date`, `reason`
2. Employee điền và submit
3. Hệ thống validate (xem Acceptance Criteria)
4. Hệ thống tạo `LeaveRequest` với `status = "pending"`
5. Hệ thống gửi email tới Manager kèm link duyệt — nếu Employee không có
   `manager_id` (đứng đầu tổ chức), gửi tới HR Director thay (xem UC-005
   E5)
6. Hệ thống quay về Dashboard với toast "Đã gửi yêu cầu"

## Alternative Flows
- **4a.** Type = `"sick"` + có file đính kèm: lưu file vào storage, link
  trong record.

## Exceptions
- **E1.** `from_date` < hôm nay: reject, hiển thị "Không thể xin nghỉ ngày
  quá khứ" (trừ HR đại diện đăng ký hộ — phase 2).
- **E2.** `to_date` < `from_date`: reject, hiển thị "Ngày kết thúc phải sau
  ngày bắt đầu".
- **E3.** Số ngày xin > balance (cho type `"annual"`): reject, hiển thị "Số
  ngày phép còn lại: X".
- **E4.** Có `LeaveRequest` pending khác overlap thời gian: reject.

## Acceptance Criteria

### AC-1: Submit yêu cầu hợp lệ
**Given:** Employee có 8 ngày phép, không có pending request
**When:** submit annual leave từ 2025-03-10 đến 2025-03-12 (3 business days)
**Then:** tạo LeaveRequest pending
**And:** gửi email tới `manager_id` của employee
**And:** balance KHÔNG bị trừ (chỉ trừ khi approved)

### AC-2: Validate from_date quá khứ
**Given:** hôm nay là 2025-03-15
**When:** submit `from_date = 2025-03-10`
**Then:** reject với message "Không thể xin nghỉ ngày quá khứ"
**And:** KHÔNG tạo record

### AC-3: Validate vượt balance
**Given:** Employee có 2 ngày phép còn lại
**When:** submit annual leave 5 ngày
**Then:** reject với message "Số ngày phép còn lại: 2"

### AC-4: Validate overlap
**Given:** Employee có pending request 2025-03-10 → 12
**When:** submit request 2025-03-11 → 13
**Then:** reject với message "Đã có yêu cầu nghỉ chồng lấn thời gian"

### AC-5: Sick leave có thể vượt balance
**Given:** Employee có 0 ngày phép
**When:** submit SICK leave 3 ngày
**Then:** tạo LeaveRequest (sick không trừ vào annual balance)

## History
- v1 (2026-08-06, An): stub từ `/specify`
- v2 (2026-08-06, An): elaboration nháp qua `/aiup-core:use-case-spec`
  (Main Success Scenario / Alternative Flows / Postconditions / Business
  Rules) — thay thế ở v3
- v3 (Ngày 3, An): bản chốt — Trigger / Main Flow / Alternative Flows /
  Exceptions / Acceptance Criteria (Given-When-Then), thay format v2
- v4 (2026-08-08, An): Main Flow bước 5 ghi rõ fallback HR Director khi
  Employee không có manager (xem UC-005 E5) — phát hiện khi đối chiếu
  lại với case study gốc
