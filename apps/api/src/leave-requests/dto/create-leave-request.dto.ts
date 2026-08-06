import { IsIn, IsNotEmpty, IsString, Matches } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateLeaveRequestDto {
  @IsIn(['annual', 'sick', 'unpaid'])
  type!: 'annual' | 'sick' | 'unpaid';

  @Matches(DATE_PATTERN, { message: 'fromDate phải theo định dạng YYYY-MM-DD' })
  fromDate!: string;

  @Matches(DATE_PATTERN, { message: 'toDate phải theo định dạng YYYY-MM-DD' })
  toDate!: string;

  @IsString()
  @IsNotEmpty({ message: 'reason không được để trống' })
  reason!: string;
}
