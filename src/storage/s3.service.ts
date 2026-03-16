import { Injectable } from '@nestjs/common'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

@Injectable()
export class S3Service {

  private s3 = new S3Client({
    region: process.env.AWS_REGION,
  })

  async uploadFile(file: Express.Multer.File) {

    const key = `${Date.now()}-${file.originalname}`

    await this.s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    )

    return {
      url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      key,
    }

  }

}