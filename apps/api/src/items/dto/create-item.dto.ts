import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min
} from 'class-validator';
import { ItemStatus } from '@prisma/client';

export class CreateItemDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @Type(() => Number)
  @IsInt()
  categoryId!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @IsDateString()
  purchaseDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedLifeDays?: number;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(ItemStatus)
  status?: ItemStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  referenceDailyValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  usageFrequency?: number;

  @IsOptional()
  @Transform(({ value }) => (value === null || value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(10)
  emotionScore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

