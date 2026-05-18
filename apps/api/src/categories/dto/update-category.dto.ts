import { CategoryScope } from '@prisma/client';
import {
  IsEnum,
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  MaxLength
} from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsEnum(CategoryScope)
  scope?: CategoryScope;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  icon?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsInt()
  parentId?: number | null;
}

