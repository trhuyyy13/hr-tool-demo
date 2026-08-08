# UC-002: Chấm công vào/ra

## Metadata
- **ID:** UC-002
- **Liên quan tới BR:** BR-001
- **Status:** approved
- **Owner:** Tuấn

## Actor
Employee (đã login)

## Mô tả ngắn
Nhân viên bấm nút chấm công vào ca / ra ca trên web. Gộp từ hai use case đề
xuất ban đầu (UC-002 check-in, UC-003 check-out) thành một, vì flow và rule
gần như giống nhau, chỉ khác field ghi nhận.

## Trigger
Employee mở trang Chấm công, bấm "Chấm công vào" hoặc "Chấm công ra".

## Preconditions
- Employee đã login (UC-001).

## Main Flow
1. Employee mở trang Chấm công.
2. Hệ thống hiển thị trạng thái chấm công hôm nay của Employee (chưa
   chấm công vào / đã vào lúc HH:mm / đã ra lúc HH:mm).
3. Employee bấm "Chấm công vào".
4. Hệ thống tạo `Attendance` record cho hôm nay với `check_in_at` = thời
   điểm hiện tại, `source = "web"`.
5. Hệ thống hiển thị lại trạng thái đã cập nhật.

## Alternative Flows

### A1: Chấm công ra
**Trigger:** Employee đã chấm công vào hôm nay, bấm "Chấm công ra" (thay
bước 3-5 Main Flow)
**Flow:**
1. Hệ thống cập nhật `check_out_at` = thời điểm hiện tại trên đúng
   `Attendance` record của hôm nay.
2. Hệ thống hiển thị lại trạng thái đã cập nhật.
3. Use case ends.

## Exceptions
- **E1.** Bấm "Chấm công vào" khi đã có `check_in_at` hôm nay: reject,
  hiển thị "Bạn đã chấm công vào lúc HH:mm hôm nay" — không tạo record
  thứ hai.
- **E2.** Bấm "Chấm công ra" khi chưa có `check_in_at` hôm nay: reject,
  hiển thị "Bạn chưa chấm công vào, không thể chấm công ra".
- **E3.** Bấm "Chấm công ra" khi đã có `check_out_at` hôm nay: reject,
  hiển thị "Bạn đã chấm công ra lúc HH:mm hôm nay".
- **E4.** Phiên đăng nhập hết hạn: theo UC-001 E4 — chuyển hướng về trang
  login, không xử lý riêng ở UC này.

## Acceptance Criteria

### AC-1: Chấm công vào lần đầu trong ngày
**Given:** Employee chưa có `Attendance` record cho hôm nay
**When:** Employee bấm "Chấm công vào"
**Then:** tạo `Attendance` record mới với `check_in_at` = hiện tại,
`check_out_at` = null, `source = "web"`

### AC-2: Chấm công vào hai lần trong ngày
**Given:** Employee đã chấm công vào lúc 08:55 hôm nay
**When:** Employee bấm "Chấm công vào" lần nữa
**Then:** reject với message "Bạn đã chấm công vào lúc 08:55 hôm nay"
**And:** KHÔNG tạo thêm record

### AC-3: Chấm công ra sau khi đã vào
**Given:** Employee đã chấm công vào lúc 08:55 hôm nay, chưa chấm công ra
**When:** Employee bấm "Chấm công ra"
**Then:** cập nhật `check_out_at` = hiện tại trên đúng record hôm nay

### AC-4: Chấm công ra khi chưa chấm công vào
**Given:** Employee chưa có `Attendance` record cho hôm nay
**When:** Employee bấm "Chấm công ra"
**Then:** reject với message "Bạn chưa chấm công vào, không thể chấm công
ra"

### AC-5: Chấm công ra hai lần trong ngày
**Given:** Employee đã chấm công vào và ra hôm nay (17:05)
**When:** Employee bấm "Chấm công ra" lần nữa
**Then:** reject với message "Bạn đã chấm công ra lúc 17:05 hôm nay"

### AC-6: Xem trạng thái khi chưa chấm công gì
**Given:** Employee chưa có `Attendance` record cho hôm nay
**When:** Employee mở trang Chấm công
**Then:** hệ thống trả về `check_in_at = null`, `check_out_at = null`

## Business Rules
- "Hôm nay" tính theo ngày dương lịch của server (demo: không xử lý múi
  giờ nhân viên riêng — cùng giả định đơn giản hoá như UC-004 với
  business day).
- Đúng 1 `Attendance` record / nhân viên / ngày — unique trên
  (`employee_id`, `date`), khớp entity model.

## History
- v1 (2026-08-06, Tuấn): stub từ `/specify`, đã gộp UC-002 + UC-003 gốc
- v2 (2026-08-08, Tuấn): elaboration đầy đủ — Trigger/Main Flow/Alternative
  Flows/Exceptions/Acceptance Criteria, cùng format đã chốt ở UC-001/UC-004
