import {
  IsString,
  IsUrl,
  IsOptional,
  Length,
  IsInt,
} from 'class-validator'
import { Sanitize } from '../../common/decorators/sanitize.decorator'

export class CreateResourceDto {

  @Sanitize()
  @IsString()
  @Length(3, 200)
  title: string

  @IsUrl()
  url: string

  @Sanitize()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string

  @Sanitize()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string

  @IsOptional()
  @IsInt()
  categoryId?: number

}