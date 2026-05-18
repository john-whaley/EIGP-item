import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength
} from 'class-validator';

export class CreateEmailDto {
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  registerPhoneIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  recoveryEmailIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  recoveryPhoneIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  platformIds?: string[];
}
