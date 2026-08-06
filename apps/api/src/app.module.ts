import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { EmployeesModule } from './employees/employees.module.js';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module.js';
import { MailModule } from './mail/mail.module.js';

@Module({
  imports: [DatabaseModule, EmployeesModule, MailModule, LeaveRequestsModule],
})
export class AppModule {}
