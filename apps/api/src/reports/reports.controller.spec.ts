import { BadRequestException } from '@nestjs/common';
import { jest } from '@jest/globals';

const { ReportsController } = await import('./reports.controller.js');

function makeRes() {
  return {
    setHeader: jest.fn(),
    send: jest.fn(),
  };
}

function makeService(rows: any[] = []) {
  return { monthlyReport: jest.fn(async () => rows) };
}

describe('ReportsController — year validation', () => {
  // Regression: year=0 (or an empty "" query param, which Number('')
  // coerces to 0) used to sail past `Number.isInteger(year)` and reach
  // monthDateRange() as-is, producing a malformed "0-08-01" date string
  // that Postgres rejected with an uncaught 22008 error — a raw 500
  // instead of the "Năm không hợp lệ" validation path the month check
  // already had. Found via manual testing, not by any existing test:
  // this controller had zero test coverage before this fix.
  it('rejects year=0 before it reaches the service', async () => {
    const service = makeService();
    const controller = new ReportsController(service as any);

    await expect(controller.monthly('0', '8', makeRes() as any)).rejects.toThrow(
      new BadRequestException('Năm không hợp lệ'),
    );
    expect(service.monthlyReport).not.toHaveBeenCalled();
  });

  it('rejects a negative year', async () => {
    const service = makeService();
    const controller = new ReportsController(service as any);

    await expect(controller.monthly('-5', '8', makeRes() as any)).rejects.toThrow(
      new BadRequestException('Năm không hợp lệ'),
    );
    expect(service.monthlyReport).not.toHaveBeenCalled();
  });

  it('rejects an empty year param', async () => {
    const service = makeService();
    const controller = new ReportsController(service as any);

    await expect(controller.monthly('', '8', makeRes() as any)).rejects.toThrow(
      new BadRequestException('Năm không hợp lệ'),
    );
  });

  it('rejects an unreasonably large year', async () => {
    const service = makeService();
    const controller = new ReportsController(service as any);

    await expect(controller.monthly('99999', '8', makeRes() as any)).rejects.toThrow(
      new BadRequestException('Năm không hợp lệ'),
    );
  });

  it('accepts a valid year and streams the CSV', async () => {
    const rows = [
      { employeeId: 1, fullName: 'A', department: 'B', workDays: 1, leaveDays: 0, lateMinutes: 0 },
    ];
    const service = makeService(rows);
    const controller = new ReportsController(service as any);
    const res = makeRes();

    await controller.monthly('2026', '8', res as any);

    expect(service.monthlyReport).toHaveBeenCalledWith(2026, 8);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('1,A,B,1,0,0'));
  });
});
