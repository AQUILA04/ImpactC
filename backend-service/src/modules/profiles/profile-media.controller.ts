import { BadRequestException, Controller, Get, NotFoundException, Param, Post, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { JwtAuthGuard } from '../../common/auth.guard';

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;

@Controller('api/media')
@UseGuards(JwtAuthGuard)
export class ProfileMediaController {
  private readonly storageDir = process.env.PROFILE_MEDIA_DIR ?? join(process.cwd(), 'uploads', 'profile-photos');

  @Post('profile-photo')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_PROFILE_PHOTO_BYTES, files: 1 },
    fileFilter: (_request, file, callback) => callback(null, SUPPORTED_IMAGE_TYPES.has(file.mimetype)),
  }))
  async uploadProfilePhoto(@UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number }): Promise<{ reference: string; width: number; height: number }> {
    if (!file || !SUPPORTED_IMAGE_TYPES.has(file.mimetype)) throw new BadRequestException('Upload a JPG, PNG, or WebP image');
    if (!file.size || file.size > MAX_PROFILE_PHOTO_BYTES) throw new BadRequestException('Profile photos must be at most 5 MB');
    const metadata = await sharp(file.buffer, { limitInputPixels: 24_000_000 }).metadata().catch(() => null);
    if (!metadata?.width || !metadata.height || metadata.width < 320 || metadata.height < 320) throw new BadRequestException('Profile photos must be at least 320 × 320 pixels');

    await mkdir(this.storageDir, { recursive: true });
    const filename = `${randomUUID()}.webp`;
    await sharp(file.buffer, { limitInputPixels: 24_000_000 })
      .rotate()
      .resize(800, 1000, { fit: 'cover', position: 'attention', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(join(this.storageDir, filename));
    return { reference: `media://profile/${filename}`, width: 800, height: 1000 };
  }

  @Get('profile/:filename')
  async readProfilePhoto(@Param('filename') filename: string): Promise<StreamableFile> {
    if (!/^[a-f0-9-]{36}\.webp$/i.test(filename)) throw new NotFoundException('Profile photo not found');
    const path = join(this.storageDir, filename);
    try { await access(path); } catch { throw new NotFoundException('Profile photo not found'); }
    return new StreamableFile(createReadStream(path), { type: 'image/webp', disposition: 'inline' });
  }
}
