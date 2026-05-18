import { IsOptional, IsString, MaxLength } from 'class-validator';

export class QueryEmailsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
