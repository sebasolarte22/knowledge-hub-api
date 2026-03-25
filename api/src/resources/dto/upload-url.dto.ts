import { IsString, IsIn } from 'class-validator'

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]

export class UploadUrlDto {

  @IsString()
  filename: string

  @IsString()
  @IsIn(ALLOWED_TYPES, {
    message: `type must be one of: ${ALLOWED_TYPES.join(', ')}`,
  })
  type: string

}
