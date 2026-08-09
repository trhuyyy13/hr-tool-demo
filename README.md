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
    UC-001-login.md            # đăng nhập (Google SSO) — spec chi tiết, status approved
    UC-002-attendance-check.md # chấm công vào/ra
    UC-004-request-leave.md    # xin nghỉ phép — spec chi tiết, status approved
    UC-005-approve-leave.md    # duyệt/từ chối nghỉ phép (manager)
    UC-006-monthly-report.md   # báo cáo tháng (HR)
  entities/
    entity-model.md            # ER diagram + attribute table (Employee, Attendance, LeaveRequest, ApprovalLog)
  diagrams/
    use-cases.puml             # PlantUML use case diagram (actor <-> UC)
apps/
  api/                         # NestJS + Drizzle ORM + PostgreSQL — implement UC-001, UC-004
    src/auth/                  # UC-001: session cookie, SessionAuthGuard, login picker (demo SSO)
  web/                         # Next.js App Router — trang /login, /leave-requests/new
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

## Day 04 — UC-001, UC-002, UC-005, UC-006: hoàn thiện 4 use case còn lại

Mục tiêu Day 04: nối tiếp Day 03, làm nốt 4 UC còn lại — UC-001 (login,
mở khoá auth thật cho UC-004), rồi UC-002 → UC-005 → UC-006 theo đúng
owner đã chốt Day 01. Cả 4 UC đi cùng một nhịp: elaborate spec (draft →
approved) → implement → verify (unit test + HTTP thật qua Postgres thật
trong Docker) → commit → push.

### UC-001 — Login, đứng vai Google SSO

Elaborate `UC-001-login.md` đầy đủ (Trigger/Main Flow/Alt Flow/4
Exceptions/6 AC). Google OAuth thật chưa nối, nên bước xác thực Google
được đứng vai bằng một trang "picker" chọn nhân viên demo — seam thay
được sau, không lẫn business logic (giống cách UC-004 mock email).
`apps/api/src/auth/` thêm session cookie HMAC-signed +
`SessionAuthGuard`; **retrofit UC-004** để `leave-requests` dùng session
này thay vì header `x-demo-employee-id` mà adversarial review Day 03 gắn
cảnh báo.

`npm test` bị **treo vô thời hạn** trên shell cục bộ (lỗi môi trường
macOS/Docker Desktop — `cp -r node_modules` cũng bị `Resource deadlock
avoided`, một bug virtiofs đã biết, không phải lỗi code). Từ đây, mọi
test trong dự án chạy qua container Linux sạch, không đụng `node_modules`
thật trên máy:

```bash
docker run --rm -v "$(pwd)":/repo -v /repo/node_modules node:22-slim \
  bash -c "cd /repo && npm ci && cd apps/api && npm test"
```

Kết quả UC-001: 10/10 test pass (AC-1, AC-2, AC-5, AC-6).

### UC-002, UC-005, UC-006 — cùng một nhịp, tóm tắt

Từ UC-002 trở đi, mỗi UC thêm bước verify **full luồng thật** (migrate +
seed + build + curl qua Postgres thật trong cùng container Docker ở
trên), không chỉ dừng ở unit test:

| UC | Việc chính | Quyết định/gap đáng chú ý | Verify |
|---|---|---|---|
| **UC-002** chấm công vào/ra | `AttendanceModule`, 1 record/nhân viên/ngày (unique index), check-in/out atomic qua `pg_advisory_xact_lock` | — | 21/21 unit test; 6/6 AC đúng qua HTTP thật, gồm regression check UC-004 |
| **UC-005** duyệt/từ chối nghỉ | `LeaveRequestsRepository.decide()`: đổi status + trừ balance (nếu annual) + ghi `ApprovalLog`, atomic trong 1 transaction | Quyền duyệt dùng `manager_id` tự tham chiếu có sẵn trên `Employee`, không thêm cột "role" | 28/28 unit test; AC-1/3/4/5/6 đúng qua HTTP thật (balance Lan 8→5) |
| **UC-006** báo cáo tháng | `ReportsModule` (không bảng mới — `MonthlyReport` là view), tổng hợp `work_days`/`leave_days`/`late_minutes` (mốc trễ 09:00 VN), xuất CSV | `Employee` chưa có cột `role` phân biệt HR → demo mở cho mọi nhân viên đã login, ghi rõ trong Preconditions | 34/34 unit test; CSV thật khớp số liệu (`work_days=2, leave_days=3, late_minutes=15`) |

### Commit + push

```bash
git commit -m "feat(UC-001): implement login (demo Google-SSO stand-in), retrofit UC-004 to use it"
git commit -m "feat(UC-002): implement attendance check-in/check-out end to end"
git commit -m "feat(UC-005): implement approve/reject leave requests end to end"
git commit -m "feat(UC-006): implement monthly report CSV export end to end"
git push
```

Với UC-006, cả **5/5 use case** chốt từ Day 01 (UC-001, UC-002, UC-004,
UC-005, UC-006) đều đã đi hết vòng spec → implement → verify qua Postgres
thật.

### Đối chiếu lại với case study gốc — vá 1 gap thật (UC-005 E5)

Đọc lại case study HR tool gốc (cùng BR-001, cùng nhân vật) phát hiện: câu
chuyện gốc gặp đúng bug này ở ngày kiểm thử cuối — nhân viên không có
`manager_id` (đứng đầu tổ chức) thì **không ai duyệt được đơn nghỉ phép
của họ**, và UC-004 cũng lặng lẽ không gửi được email duyệt. Case study
gốc xử lý bằng rule "không có manager thì HR Director duyệt thay" — repo
này lúc đó chưa có, nên bổ sung ngay: `HR_DIRECTOR_EMAIL` (mặc định nhân
viên HR đã seed sẵn) vừa nhận email UC-004 vừa được phép duyệt/từ chối ở
UC-005 khi Employee không có manager (E5, AC-8 mới).

```bash
git commit -m "fix(UC-005): HR Director fallback when the requester has no manager (E5)"
git push
```

Verify: 37/37 unit test pass, và qua HTTP thật — Minh (không có manager)
nộp đơn, Hà (HR Director) duyệt được, balance trừ đúng 10→7, người khác
vẫn bị 403.

## Day 05 — deploy thử và vòng phản hồi

Case study gốc dành hẳn Ngày 5 để deploy staging cho chị Hà và nhân viên
dùng thử, sửa vài bug/UX từ phản hồi thật, rồi mới deploy production. Repo
demo này chưa có staging thật, nên tự đóng vai người dùng trước khi đưa
cho stakeholder dùng thử.

### 1. Chạy thật API + Web, không chỉ curl

Build production của `apps/web` dính bug prerender riêng của Next 15.5.x
("`<Html>` should not be imported outside of `pages/_document`" khi
prerender `/404`, không liên quan code) — né bằng `next dev` chạy trong
container sạch (source lấy qua `git archive`, không đụng virtiofs nên
không bị hang):

```bash
git archive --format=tar HEAD -o src.tar
docker run -d -p 13000:3000 -p 13001:3001 \
  -v "$(pwd)/src.tar":/src.tar:ro node:22-slim bash -c '
    apt-get update -qq && apt-get install -y -qq curl procps
    tar -xf /src.tar -C /work && cd /work && npm ci
    cd apps/api && npx drizzle-kit migrate && npm run db:seed && npm run build
    node dist/main.js &
    cd ../web && npx next dev -p 3000
  '
```

### 2. Tự dùng thử — bắt được 1 bug thật

Bấm tay qua cả 5 luồng UC trên trình duyệt thật, không chỉ `curl`. Phát
hiện ngay: `GET /api/employees` (danh sách nhân viên cho trang login
picker) thiếu field `email` — nút "Đăng nhập bằng Google" gọi
`handleLogin(undefined)`, mọi lần đăng nhập qua UI thật đều lỗi "email
must be an email". Lý do `curl`/unit test trước giờ không bắt được: mọi
test đều hardcode sẵn email thật (`lan.tran@company.com`...) thay vì đọc
từ chính endpoint này.

```bash
git commit -m "fix(UC-001): login picker was unusable — /api/employees dropped email"
git push
```

Sau khi vá, đăng nhập + cả 5 luồng (chấm công, xin nghỉ, duyệt, báo cáo)
đều chạy đúng trên UI thật. **38/38 unit test pass.**

### 3. Đưa link cho người dùng thử thật

Container vẫn chạy nền ở `http://localhost:13000` — đưa thẳng link đó,
kèm hướng dẫn: đăng nhập bằng picker demo (chưa nối Google OAuth thật),
dùng **Nguyễn Văn Minh** hoặc **Phạm Thị Hà** để test UC-005 (`/manager/approvals`).
Đây là container tạm cho việc dùng thử tại chỗ, không phải deploy public —
muốn có link chia sẻ được cho người khác (Vercel hoặc nền tảng khác) là
một bước riêng, cần quyết định nền tảng trước.

### 4. Phản hồi thật từ người dùng thử — bug thứ hai

Đúng như case study gốc mô tả ("chị Hà và nhân viên dùng thử → sửa vài
bug/UX"): người dùng thật bấm link ở bước 3, báo lại "bấm UC nào cũng ra
Xin nghỉ phép". Nguyên nhân: trang login hard-code
`router.replace('/leave-requests/new')` sau khi đăng nhập, bỏ qua việc
người dùng ban đầu định vào UC nào.

```bash
git commit -m "fix(UC-001): login always dumped users onto /leave-requests/new"
git push
```

Sửa bằng cách mỗi trang cần login redirect sang `/login?next=<path của
chính nó>` thay vì `/login` trơn; trang login đọc `next` rồi quay lại
đúng chỗ sau khi đăng nhập (mặc định `/leave-requests/new` nếu vào thẳng
`/login`, giữ tương thích ngược). Type-check sạch, verify lại trên UI
thật: bấm "Chấm công" → login → vào đúng `/attendance`, không còn lạc
sang "Xin nghỉ phép" nữa.

### 5. Phản hồi thứ ba — "không duyệt được" là do vai trò vô hình

Người dùng thử tiếp tục báo "K duyệt được" khi bấm Duyệt ở
`/manager/approvals`. Tái hiện qua HTTP thật: đăng nhập bằng Minh (quản
lý) thì duyệt thành công (201); vậy backend không sai — vấn đề là UI
không hề cho biết ai được phép duyệt, nên tài khoản Employee bấm vào
thấy danh sách rỗng hoặc bị 403 mà không hiểu vì sao.

Repo chưa có cột `role` trên `Employee`, và cố tình không thêm — thêm
cột mới có nguy cơ lệch khỏi logic phân quyền UC-005 vốn đã dựa thẳng
vào quan hệ `manager_id` có sẵn. Thay vào đó suy ra vai trò tại chỗ:

```ts
// apps/api/src/employees/role.util.ts
function computeRole(employee, allEmployees) {
  if (employee.email === HR_DIRECTOR_EMAIL) return 'hr_director';
  return allEmployees.some((e) => e.managerId === employee.id) ? 'manager' : 'employee';
}
```

`role` được thêm vào response của `GET /api/employees` và
`/api/auth/{login,me}` — dùng đúng dữ liệu UC-005 đã tin tưởng, không
tạo nguồn sự thật thứ hai. Trên UI: picker đăng nhập gắn badge vai trò
cho từng nhân viên; trang duyệt đơn hiện badge của người đang đăng nhập
và, nếu không phải Quản lý/HR Director, hiện banner giải thích rõ thay
vì để danh sách trống khó hiểu. Nhân tiện thay toàn bộ style rời rạc
từng trang bằng một design system dùng chung (`globals.css`: card,
button, badge, banner, form field).

```bash
git commit -m "feat(UI): computed role badges + visual redesign to fix \"can't approve\" confusion"
git push
```

Verify: 45/45 unit test pass (thêm test cho `computeRole` ở cả
`employees.service.spec.ts` và `auth.service.spec.ts`), `tsc --noEmit`
sạch, và click-through thật: đăng nhập bằng Lan (Employee) vào
`/manager/approvals` → thấy banner giải thích thay vì bấm Duyệt rồi ăn
403 không rõ lý do; đăng nhập bằng Minh/Hà → duyệt bình thường.

Đóng vòng lặp lại toàn bộ 5 luồng với vai trò đã hiện rõ: Lan nộp đơn
xin nghỉ 2 ngày → Minh (Quản lý) duyệt → balance của Lan trừ đúng 8→6.
Không có lỗi console mới ngoài warning hydration vô hại của extension.

### 6. Phản hồi thứ tư — không có lối quay lại trang chủ

Cả 6 trang (login, chấm công, xin nghỉ, duyệt đơn, báo cáo, và cả trang
chủ) không có nút/link nào quay lại danh sách UC — chỉ có thể sửa URL
tay. Thêm link `← Trang chủ` (`.back-link` trong `globals.css`) ở đầu
mỗi trang trừ trang chủ.

```bash
git commit -m "fix(UI): add \"← Trang chủ\" back link to every page"
git push
```

Verify: `tsc --noEmit` sạch, click-through cả 6 trang — mỗi trang đều
có link, bấm vào quay đúng về `/`.
