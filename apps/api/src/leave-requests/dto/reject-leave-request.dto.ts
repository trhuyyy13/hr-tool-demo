import { IsOptional, IsString } from 'class-validator';

export class RejectLeaveRequestDto {
  // Emptiness (E3/AC-4) is checked in the service, not here — that keeps
  // the rejection message a plain string like every other exception in
  // this module, instead of class-validator's array-of-messages shape.
  @IsOptional()
  @IsString()
  reason?: string;
}
