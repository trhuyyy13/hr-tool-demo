# BR-001: Internal HR Tool — Chấm công & Nghỉ phép

## Metadata
- **ID:** BR-001
- **Status:** approved
- **Owner:** Chị Hà (HR)
- **Stakeholders:** HR, Manager, Employee, Engineering
- **Target Quarter:** MVP - Tuần 1

## Background
HR đang quản lý chấm công và nghỉ phép bằng Excel cộng Google Form. Cuối mỗi
tháng, HR mất gần hai ngày để tổng hợp, đối chiếu, hỏi lại manager và sửa lỗi
nhập sai. CEO yêu cầu team Engineering làm một internal tool đơn giản, dùng
được ngay trong tuần sau.

## Goal
Tự động hóa quy trình chấm công và xét nghỉ phép, giảm thời gian xử lý cuối
tháng của HR từ 16 giờ xuống dưới 2 giờ.

## Success Metrics
- `HR_processing_time_per_month` < 2h (đo qua self-report của HR)
- `Employee_self_service_rate` > 80% (xin nghỉ không cần gửi email cho HR)
- `Approval_turnaround` < 24h (median)

## In Scope (MVP - Tuần 1)
- Chấm công vào/ra (web, không cần app)
- Xin nghỉ phép (annual, sick, unpaid)
- Approval flow 1 cấp (manager trực tiếp)
- Báo cáo tháng cho HR (export CSV)

## Out of Scope
- Mobile app
- Tích hợp lương
- Đa cấp duyệt
- Chấm công bằng GPS/camera
- Trừ ngày lễ quốc gia (holiday) khi tính số ngày nghỉ — MVP chỉ trừ weekend,
  xem [specs/entities/entity-model.md](../entities/entity-model.md#leaverequest)

## Related Use Cases
- UC-001: Đăng nhập bằng tài khoản công ty (Google SSO)
- UC-002: Chấm công vào/ra
- UC-004: Xin nghỉ phép
- UC-005: Duyệt/từ chối nghỉ phép (manager)
- UC-006: Báo cáo tháng (HR)

## Related Artifacts
- [Entity Model](../entities/entity-model.md)
- [Use Case Diagram](../diagrams/use-cases.puml)

## Open Questions
- [x] Ngày lễ quốc gia có cần trừ vào tính business day không? (Quyết định
  2026-08-06, Tuấn: KHÔNG trừ ở MVP, chỉ trừ weekend — xem Out of Scope và
  [entity-model.md](../entities/entity-model.md#leaverequest))

## History
- v1 (2026-08-06, Tuấn): initial, chốt sau buổi trao đổi 90 phút với chị Hà
- v2 (2026-08-06, Tuấn): thêm Entity Model + Use Case Diagram, chốt quyết
  định không trừ ngày lễ quốc gia ở MVP
