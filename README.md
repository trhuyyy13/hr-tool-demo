# HR Tool Demo — Spec-Driven Development (SDD)

Demo áp dụng Spec-Driven Development cho một internal HR tool (chấm công &
nghỉ phép), dùng Claude Code + speckit skills để đi từ business requirement
đến use case chi tiết.

## Cấu trúc repo

```
specs/
  business-requirements/
    BR-001-hr-tool.md          # business requirement gốc
  use-cases/
    UC-001-login.md            # đăng nhập (Google SSO)
    UC-002-attendance-check.md # chấm công vào/ra
    UC-004-request-leave.md    # xin nghỉ phép — spec chi tiết, status approved
    UC-005-approve-leave.md    # duyệt/từ chối nghỉ phép (manager)
    UC-006-monthly-report.md   # báo cáo tháng (HR)
  entities/
    entity-model.md            # ER diagram + attribute table (Employee, Attendance, LeaveRequest, ApprovalLog)
  diagrams/
    use-cases.puml             # PlantUML use case diagram (actor <-> UC)
apps/
  api/                         # NestJS + Drizzle ORM + PostgreSQL — implement UC-004
  web/                         # Next.js App Router — trang /leave-requests/new
docker-compose.yml             # Postgres cho local dev (cổng 5433)
.claude/skills/                # speckit skills cho Claude Code (/specify, /plan, /tasks...)
.specify/                      # templates, scripts, constitution cho spec-kit workflow
```

## Day 01 — chốt Business Requirement & 5 Use Case

Mục tiêu Day 01: biến buổi trao đổi với stakeholder (chị Hà - HR) thành một
bộ tài liệu spec có thể trace được, làm nền cho các bước design/implement sau.

1. **Thu thập bối cảnh nghiệp vụ**
   HR đang chấm công + xét nghỉ phép bằng Excel/Google Form, cuối tháng mất
   ~2 ngày để tổng hợp, đối chiếu, sửa lỗi. CEO yêu cầu có tool nội bộ dùng
   được ngay trong tuần sau.

2. **Viết Business Requirement — `BR-001-hr-tool.md`**
   Chốt sau buổi trao đổi 90 phút với chị Hà, gồm:
   - **Background** — vấn đề hiện tại và lý do cần làm.
   - **Goal** — tự động hoá chấm công & xét nghỉ, giảm thời gian xử lý cuối
     tháng của HR từ 16h xuống dưới 2h.
   - **Success Metrics** — 3 chỉ số đo được: thời gian xử lý HR, tỷ lệ tự
     phục vụ của nhân viên, thời gian duyệt trung bình.
   - **In Scope / Out of Scope** cho MVP (Tuần 1) — ví dụ loại trừ mobile
     app, tích hợp lương, đa cấp duyệt, chấm công GPS/camera.
   - **Open Questions** — các điểm chưa chốt, để lại quyết định tạm thời
     (ví dụ: ngày lễ có trừ vào business day không).

3. **Rã BR-001 thành 5 Use Case** (mỗi UC là 1 file trong `specs/use-cases/`)
   - UC-001: Đăng nhập bằng tài khoản công ty (Google SSO)
   - UC-002: Chấm công vào/ra
   - UC-004: Xin nghỉ phép (annual/sick/unpaid)
   - UC-005: Duyệt/từ chối nghỉ phép (manager)
   - UC-006: Báo cáo tháng cho HR (export CSV)

   Mỗi UC gắn `Liên quan tới BR: BR-001` để giữ traceability ngược về
   business requirement, có owner riêng (Tuấn, An, Diệp) và status `draft`.

4. **Liên kết hai chiều BR ↔ UC**
   `BR-001-hr-tool.md` có mục **Related Use Cases** liệt kê đủ 5 UC ở trên —
   đảm bảo đọc BR là biết ngay phạm vi UC cần làm, và đọc UC là biết rõ nó
   phục vụ business requirement nào.

5. **Commit chốt Day 01**

   ```bash
   git commit -m "feat(BR-001): initial requirement catalog, 5 use cases"
   ```

   Đánh dấu mốc: BR-001 ở trạng thái `approved`, 5 UC ở trạng thái `draft`,
   sẵn sàng cho bước tiếp theo (spec chi tiết / design / plan).

## Day 02 — Entity Model & Use Case Diagram (plugin AIUP)

Mục tiêu Day 02: từ 5 UC của Day 01, dựng **Use Case Diagram** (PlantUML) và
**Entity Model** (ER diagram + attribute table), dùng plugin **AIUP (AI
Unified Process)** cho Claude Code thay vì viết tay.

### 1. Cài plugin AIUP

AIUP là marketplace plugin cho Claude Code, đi theo methodology
*vision → requirements → entity model → use case spec → implement*. Cài
bằng 2 slash command gõ thẳng trong Claude Code (không phải lệnh shell, nên
không cần `!`):

```
/plugin marketplace add ai-unified-process/marketplace
/plugin install aiup-core@ai-unified-process-marketplace
```

Sau khi cài, `aiup-core` cung cấp các skill: `use-case-diagram`,
`use-case-spec`, `entity-model`, `requirements`, `test-case`,
`reverse-engineer` — gọi qua `/aiup-core:<skill-name>`.

### 2. Sinh Use Case Diagram

Chạy `/aiup-core:use-case-diagram`. Skill này mặc định đọc
`docs/requirements.md` — nhưng repo dùng convention của speckit
(`specs/business-requirements/BR-001-hr-tool.md` +
`specs/use-cases/*.md`), nên lấy 2 nguồn đó làm input thay thế. Kết quả:
`use-cases.puml` với 3 actor (Employee, Manager, HR) và 5 use case, có
quan hệ `<<include>>` về UC-001 (mọi UC đều cần login trước).

### 3. Sinh Entity Model

Chạy `/aiup-core:entity-model`, đọc use case + business requirement để suy
ra entity. Bản nháp đầu có 3 entity (Employee, AttendanceRecord,
LeaveRequest gộp cả approval).

### 4. Review & chốt bản cuối

Trong lúc review, **Tuấn phát hiện một chỗ thiếu**: use case xin nghỉ chưa
xử lý ngày lễ quốc gia khi tính số ngày nghỉ. Hỏi lại chị Hà — xác nhận
tháng đầu MVP chỉ cần trừ weekend, chưa cần trừ holiday. Team chốt bản cuối
`entity-model.md` với 5 khoản mục:

- **Employee** — thêm `department`, `annual_leave_balance` (mặc định 12
  ngày/năm), `start_date`; có nhiều `Attendance` và `LeaveRequest`.
- **Attendance** — thêm `source` (`"web"` | `"manual_by_hr"`), đúng 1
  record/ngày/employee.
- **LeaveRequest** — business rule ghi rõ: số ngày tính theo **business
  day**, trừ weekend, **không trừ holiday ở MVP**.
- **ApprovalLog** (entity mới) — log mọi thay đổi status của LeaveRequest,
  phục vụ traceability cho HR.
- **MonthlyReport** — ghi rõ là **view tính toán, không phải table** lưu
  trữ, tổng hợp từ Attendance + LeaveRequest.

Quyết định "không trừ holiday ở MVP" được ghi ở **2 nơi** để tránh lạc mất
quyết định: `entity-model.md` (business rule của LeaveRequest) và
`BR-001-hr-tool.md` → **Out of Scope**. Open Question tương ứng trong
BR-001 được đánh dấu `[x]` đã chốt.

### 5. Tái cấu trúc thư mục

Chuyển output của AIUP từ `docs/` (convention mặc định của AIUP) vào
`specs/` để đồng bộ với cấu trúc speckit đã có từ Day 01:

```bash
mkdir -p specs/entities specs/diagrams
mv docs/use_cases.puml specs/diagrams/use-cases.puml
# entity-model.md viết lại trực tiếp vào specs/entities/entity-model.md
rm -rf docs
```

`BR-001-hr-tool.md` được thêm mục **Related Artifacts** trỏ tới
`entity-model.md` và `use-cases.puml`, giữ traceability BR → UC → Entity
Model → Diagram theo một chiều duy nhất.

### 6. Commit chốt Day 02

```bash
git add specs/
git commit -m "feat(BR-001): entity model + use case diagram, no-holiday-MVP decision"
```

## Day 03 — UC-004 từ spec đến code chạy được (plan → tasks → implement)

Mục tiêu Day 03: chứng minh spec đủ chi tiết để build trực tiếp — đi đúng
chuỗi **use-case-spec → `/plan` → `/tasks` → `/implement`**, không nhảy cóc
bước nào.

### 1. Viết chi tiết UC-004 (`/aiup-core:use-case-spec UC-004`)

Từ stub Day 01, elaborate `UC-004-request-leave.md` thành spec đầy đủ:
`Trigger` → `Preconditions` → `Main Flow` (6 bước) → `Alternative Flows` →
4 `Exceptions` (E1-E4, mỗi cái có message chính xác) → 5 `Acceptance
Criteria` dạng Given-When-Then (AC-1..AC-5). `Status` chuyển `draft` →
`approved`.

### 2. `/plan UC-004`

Repo lúc này chưa có dòng code nào — plan mode hỏi rõ trước khi giả định:

- **Stack**: NestJS + Next.js App Router (TypeScript monorepo, npm
  workspaces), chọn vì khớp sẵn với plugin đồng hành `aiup-nestjs-nextjs`.
- **Độ chân thực**: demo-level — mock "đăng nhập" (UC-001 chưa build) và
  mock gửi email, nhưng cả hai đều được thiết kế như seam có thể thay thế
  sau, không lẫn vào business logic.
- **Persistence**: PostgreSQL qua Drizzle ORM, migration sinh tự động
  (`drizzle-kit generate`), không hand-write SQL.

Plan chỉ động tới đúng 2 entity mà UC-004 cần — `Employee` +
`LeaveRequest` — không đụng `Attendance`/`ApprovalLog`/`MonthlyReport`.

### 3. `/tasks UC-004`

7 task, theo layer thay vì theo module NestJS:

1. Migration: `leave_request` (không kèm `approval_logs` — UC-004 không
   dùng tới, để dành cho UC-005)
2. Entity/response types (TypeScript)
3. API `POST /api/leave-requests`
4. Validation layer (E1-E4)
5. Email notification (stub demo)
6. UI form
7. Test suite (5 AC)

(Task "update Dashboard" trong bản nháp ban đầu bị bỏ — Dashboard không nằm
trong 5 UC đã chốt, ngoài scope UC-004.)

### 4. `/implement` + adversarial review

Implement xong 7 task, chạy `/codex:adversarial-review` trước khi commit.
Kết quả `needs-attention`, 3 lỗi:

| Lỗi | Sửa |
|---|---|
| Header `x-demo-employee-id` có thể giả mạo danh tính bất kỳ nhân viên nào | `main.ts` từ chối khởi động nếu `NODE_ENV=production` — demo auth không thể lọt ra ngoài môi trường demo |
| Check-trùng-lịch (E4) và insert tách rời → race condition khi 2 request cùng lúc | Gộp vào 1 transaction Postgres với `pg_advisory_xact_lock` theo `employeeId` |
| Có `schema.ts` nhưng chưa có migration thật, deploy mới sẽ lỗi | Chạy `drizzle-kit generate` thật, đọc SQL sinh ra trước khi commit |

### 5. Verify thật (không chỉ unit test)

```bash
docker compose up -d                 # Postgres tại localhost:5433
cd apps/api
npx drizzle-kit migrate
npm run db:seed                      # 5 nhân viên demo, wired sẵn cho AC-1/3/4/5
npm test                             # 5/5 pass
npm run start:dev                    # API :3001
cd ../web && npm run dev             # Web :3000 (hoặc port kế tiếp nếu bị chiếm)
```

Gọi trực tiếp `curl` cho cả 5 AC qua Postgres thật — đúng 100% cả HTTP
status lẫn message lỗi tiếng Việt; kiểm DB xác nhận `approver_id` vẫn NULL
và `annual_leave_balance` không bị trừ lúc submit (chỉ trừ khi UC-005
duyệt).

### 6. Commit chốt Day 03

```bash
git add apps/ docker-compose.yml package.json package-lock.json specs/use-cases/UC-004-request-leave.md
git commit -m "feat(UC-004): implement request-leave end to end (NestJS + Next.js + Drizzle)"
```
