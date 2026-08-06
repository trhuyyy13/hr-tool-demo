import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller.js';
import { EmployeesRepository } from './employees.repository.js';
import { EmployeesService } from './employees.service.js';

@Module({
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeesRepository],
  // Exported so leave-requests reuses this repository instead of opening a
  // second query path to the `employee` table.
  exports: [EmployeesRepository],
})
export class EmployeesModule {}
