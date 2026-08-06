'use client';

import { useEffect, useState } from 'react';

type Employee = {
  id: number;
  fullName: string;
  department: string;
  annualLeaveBalance: number;
};

type LeaveType = 'annual' | 'sick' | 'unpaid';

const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  annual: 'Nghỉ phép năm',
  sick: 'Nghỉ ốm',
  unpaid: 'Nghỉ không lương',
};

const DEMO_EMPLOYEE_STORAGE_KEY = 'demoEmployeeId';

export default function NewLeaveRequestPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

  const [type, setType] = useState<LeaveType>('annual');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/employees')
      .then((res) => res.json())
      .then((data: Employee[]) => {
        setEmployees(data);
        const stored = Number(localStorage.getItem(DEMO_EMPLOYEE_STORAGE_KEY));
        const initial = data.find((e) => e.id === stored)?.id ?? data[0]?.id ?? null;
        setSelectedEmployeeId(initial);
      })
      .catch(() => setErrorMessage('Không tải được danh sách nhân viên'));
  }, []);

  function handleSelectEmployee(id: number) {
    setSelectedEmployeeId(id);
    localStorage.setItem(DEMO_EMPLOYEE_STORAGE_KEY, String(id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmployeeId) return;

    setSubmitting(true);
    setErrorMessage(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-employee-id': String(selectedEmployeeId),
        },
        body: JSON.stringify({ type, fromDate, toDate, reason }),
      });

      const body = await res.json();

      if (!res.ok) {
        const message = Array.isArray(body.message) ? body.message.join('; ') : body.message;
        setErrorMessage(message ?? 'Có lỗi xảy ra');
        return;
      }

      setSuccess(true);
      setType('annual');
      setFromDate('');
      setToDate('');
      setReason('');
    } catch {
      setErrorMessage('Không kết nối được tới server');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  return (
    <main style={{ maxWidth: 480, margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>Xin nghỉ phép</h1>

      <section style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fff', borderRadius: 8 }}>
        <label htmlFor="employee" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
          Đăng nhập với tư cách (demo)
        </label>
        <select
          id="employee"
          value={selectedEmployeeId ?? ''}
          onChange={(e) => handleSelectEmployee(Number(e.target.value))}
          style={{ width: '100%', padding: '0.5rem' }}
        >
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.fullName} ({emp.department}) — còn {emp.annualLeaveBalance} ngày phép
            </option>
          ))}
        </select>
      </section>

      {success && (
        <div style={{ background: '#e6f4ea', color: '#1e7a34', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem' }}>
          Đã gửi yêu cầu
        </div>
      )}
      {errorMessage && (
        <div style={{ background: '#fdecea', color: '#b3261e', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem' }}>
          {errorMessage}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#fff', padding: '1rem', borderRadius: 8 }}
      >
        <div>
          <label htmlFor="type" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
            Loại nghỉ
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as LeaveType)}
            style={{ width: '100%', padding: '0.5rem' }}
          >
            {(Object.keys(LEAVE_TYPE_LABEL) as LeaveType[]).map((t) => (
              <option key={t} value={t}>
                {LEAVE_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="fromDate" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
              Từ ngày
            </label>
            <input
              id="fromDate"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="toDate" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
              Đến ngày
            </label>
            <input
              id="toDate"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
        </div>

        <div>
          <label htmlFor="reason" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
            Lý do
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={3}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !selectedEmployeeId}
          style={{ padding: '0.6rem', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
        </button>

        {selectedEmployee && type === 'annual' && (
          <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>
            {selectedEmployee.fullName} hiện còn {selectedEmployee.annualLeaveBalance} ngày phép năm.
          </p>
        )}
      </form>
    </main>
  );
}
