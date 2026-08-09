import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { IsCalendarDate } from '../../common/is-calendar-date.decorator.js';

export class CreateLeaveRequestDto {
  @IsIn(['annual', 'sick', 'unpaid'])
  type!: 'annual' | 'sick' | 'unpaid';

  @IsCalendarDate({ message: 'fromDate phải theo định dạng YYYY-MM-DD' })
  fromDate!: string;

  @IsCalendarDate({ message: 'toDate phải theo định dạng YYYY-MM-DD' })
  toDate!: string;

  @IsString()
  @IsNotEmpty({ message: 'reason không được để trống' })
  reason!: string;
}
