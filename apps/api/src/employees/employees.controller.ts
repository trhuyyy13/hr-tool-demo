import { Controller, Get } from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import type { EmployeeResponse } from './dto/employee.response.js';

// GET /api/employees — backs the demo "logged in as" switcher on the frontend
// (there is no real auth yet; UC-001 will replace this list-and-pick flow).
@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get()
  async list(): Promise<EmployeeResponse[]> {
    return this.service.listAll();
  }
}
