import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionAuthGuard } from './session-auth.guard.js';

@Module({
  imports: [EmployeesModule],
  controllers: [AuthController],
  providers: [AuthService, SessionAuthGuard],
  exports: [SessionAuthGuard],
})
export class AuthModule {}
