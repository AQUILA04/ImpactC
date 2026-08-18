import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Readable } from 'node:stream';

export type ProfilePhotoVariant = 'original' | 'thumbnail';

@Injectable()
export class ProfileMediaStorage implements OnModuleInit {
  private readonly bucket = process.env.S3_BUCKET ?? 'impactc-media';
  private readonly client = new S3Client({
    endpoint: process.env.S3_ENDPOINT ?? 'http://127.0.0.1:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? 'impactc_minio',
      secretAccessKey: process.env.S3_SECRET_KEY ?? 'impactc_minio_change_me',
    },
  });

  async onModuleInit(): Promise<void> {
    if (process.env.S3_AUTO_CREATE_BUCKET !== 'true') return;

    try {
      await this.assertReady();
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async assertReady(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }

  async putProfilePhoto(
    id: string,
    original: Buffer,
    thumbnail: Buffer,
  ): Promise<void> {
    const originalKey = this.key(id, 'original');
    const thumbnailKey = this.key(id, 'thumbnail');
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: originalKey,
          Body: original,
          ContentType: 'image/webp',
          CacheControl: 'private, max-age=300',
          Metadata: { variant: 'original' },
        }),
      );
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: thumbnailKey,
          Body: thumbnail,
          ContentType: 'image/webp',
          CacheControl: 'private, max-age=86400',
          Metadata: { variant: 'thumbnail' },
        }),
      );
    } catch (error) {
      await this.client
        .send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: {
              Objects: [{ Key: originalKey }, { Key: thumbnailKey }],
              Quiet: true,
            },
          }),
        )
        .catch(() => undefined);
      throw error;
    }
  }

  async getProfilePhoto(
    id: string,
    variant: ProfilePhotoVariant,
  ): Promise<Readable> {
    const object = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: this.key(id, variant) }),
    );
    return object.Body as Readable;
  }

  private key(id: string, variant: ProfilePhotoVariant): string {
    return `profiles/${id}/${variant}.webp`;
  }
}
