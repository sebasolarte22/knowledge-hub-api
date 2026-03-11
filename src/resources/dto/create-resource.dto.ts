import {
  IsString,
  IsUrl,
  IsOptional,
  Length,
  IsInt,
} from 'class-validator'

export class CreateResourceDto {

  @IsString()
  @Length(3, 200)
  title: string

  @IsUrl()
  url: string

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string

  @IsOptional()
  @IsInt()
  categoryId?: number

}