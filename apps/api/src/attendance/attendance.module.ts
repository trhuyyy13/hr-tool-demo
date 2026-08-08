import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceRepository } from './attendance.repository.js';
import { AttendanceService } from './attendance.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepository],
})
export class AttendanceModule {}
