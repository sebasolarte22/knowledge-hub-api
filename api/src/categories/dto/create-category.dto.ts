import { IsString, Length } from 'class-validator'
import { Sanitize } from '../../common/decorators/sanitize.decorator'

export class CreateCategoryDto {

  @Sanitize()
  @IsString()
  @Length(2, 100)
  name: string

}