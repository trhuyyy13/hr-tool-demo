import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { MailModule } from '../mail/mail.module.js';
import { LeaveRequestsController } from './leave-requests.controller.js';
import { LeaveRequestsRepository } from './leave-requests.repository.js';
import { LeaveRequestsService } from './leave-requests.service.js';

@Module({
  imports: [AuthModule, EmployeesModule, MailModule],
  controllers: [LeaveRequestsController],
  providers: [LeaveRequestsService, LeaveRequestsRepository],
})
export class LeaveRequestsModule {}
