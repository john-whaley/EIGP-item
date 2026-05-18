import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(12)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  code!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  newPassword!: string;
}
