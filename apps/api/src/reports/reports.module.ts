import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsRepository } from './reports.repository.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [AuthModule, EmployeesModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsRepository],
})
export class ReportsModule {}
