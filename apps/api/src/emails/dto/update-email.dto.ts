import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength
} from 'class-validator';

export class UpdateEmailDto {
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1)
  @IsUUID('4', { each: true })
  registerPhoneIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1)
  @IsUUID('4', { each: true })
  recoveryEmailIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1)
  @IsUUID('4', { each: true })
  recoveryPhoneIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  platformIds?: string[];
}
