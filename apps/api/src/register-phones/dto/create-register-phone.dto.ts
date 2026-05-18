import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRegisterPhoneDto {
  @IsString()
  @MaxLength(10)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  countryCode!: string;

  @IsString()
  @MaxLength(32)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
