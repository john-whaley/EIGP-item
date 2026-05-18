import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { ItemStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryItemsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  categoryId?: number;

  @IsOptional()
  @IsEnum(ItemStatus)
  status?: ItemStatus;

  @IsOptional()
  @IsIn(['updatedAt', 'purchaseDate', 'price', 'name', 'dailyValue', 'costPerformance', 'usedDays'])
  sortBy = 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order = 'desc';
}

