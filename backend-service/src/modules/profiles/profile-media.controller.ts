import { BadRequestException, Controller, Get, NotFoundException, Param, Post, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { JwtAuthGuard } from '../../common/auth.guard';
import { ProfileMediaStorage, type ProfilePhotoVariant } from './profile-media.storage';

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
const PROFILE_PHOTO_ID = /^[a-f0-9-]{36}$/i;

@Controller('api/media')
@UseGuards(JwtAuthGuard)
export class ProfileMediaController {
  constructor(private readonly storage: ProfileMediaStorage) {}

  @Post('profile-photo')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_PROFILE_PHOTO_BYTES, files: 1 },
    fileFilter: (_request, file, callback) => callback(null, SUPPORTED_IMAGE_TYPES.has(file.mimetype)),
  }))
  async uploadProfilePhoto(@UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number }): Promise<{ reference: string; original: { width: number; height: number }; thumbnail: { width: number; height: number } }> {
    if (!file || !SUPPORTED_IMAGE_TYPES.has(file.mimetype)) throw new BadRequestException('Upload a JPG, PNG, or WebP image');
    if (!file.size || file.size > MAX_PROFILE_PHOTO_BYTES) throw new BadRequestException('Profile photos must be at most 5 MB');
    const metadata = await sharp(file.buffer, { limitInputPixels: 24_000_000 }).metadata().catch(() => null);
    if (!metadata?.width || !metadata.height || metadata.width < 320 || metadata.height < 320) throw new BadRequestException('Profile photos must be at least 320 × 320 pixels');

    const [original, thumbnail] = await Promise.all([
      sharp(file.buffer, { limitInputPixels: 24_000_000 }).rotate().resize(800, 1000, { fit: 'cover', position: 'attention' }).webp({ quality: 82 }).toBuffer(),
      sharp(file.buffer, { limitInputPixels: 24_000_000 }).rotate().resize(160, 200, { fit: 'cover', position: 'attention' }).webp({ quality: 62 }).toBuffer(),
    ]);
    const id = randomUUID();
    await this.storage.putProfilePhoto(id, original, thumbnail);
    return { reference: `media://profile/${id}`, original: { width: 800, height: 1000 }, thumbnail: { width: 160, height: 200 } };
  }

  @Get('profile/:id')
  async readOriginal(@Param('id') id: string): Promise<StreamableFile> {
    return this.readProfilePhoto(id, 'original');
  }

  @Get('profile/:id/thumbnail')
  async readThumbnail(@Param('id') id: string): Promise<StreamableFile> {
    return this.readProfilePhoto(id, 'thumbnail');
  }

  private async readProfilePhoto(id: string, variant: ProfilePhotoVariant): Promise<StreamableFile> {
    if (!PROFILE_PHOTO_ID.test(id)) throw new NotFoundException('Profile photo not found');
    try {
      return new StreamableFile(await this.storage.getProfilePhoto(id, variant), { type: 'image/webp', disposition: 'inline' });
    } catch {
      throw new NotFoundException('Profile photo not found');
    }
  }
}
