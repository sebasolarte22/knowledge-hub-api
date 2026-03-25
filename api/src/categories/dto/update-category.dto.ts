import { IsString, IsOptional, Length } from 'class-validator'
import { Sanitize } from '../../common/decorators/sanitize.decorator'

export class UpdateCategoryDto {

  @Sanitize()
  @IsString()
  @IsOptional()
  @Length(1, 100)
  name?: string

}
