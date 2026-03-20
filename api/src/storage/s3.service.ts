import { Injectable } from '@nestjs/common'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

@Injectable()
export class S3Service {

  private s3 = new S3Client({
    region: process.env.AWS_REGION,
  })

  // Subida directa desde el backend 
  async uploadFile(file: any) {

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

  async generateUploadUrl(filename: string, contentType: string) {

    const key = `${Date.now()}-${filename}`

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: 300, // 5min
    })

    return {
      uploadUrl,
      key,
      publicUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
    }

  }

}