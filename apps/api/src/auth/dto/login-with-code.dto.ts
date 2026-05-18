import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginWithCodeDto {
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(12)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  code!: string;
}
