import { Controller, Post, UploadedFile, UseInterceptors, Body, Headers, ForbiddenException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as fs from 'fs/promises';
import * as path from 'path';

@Controller('migration')
export class MigrationController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('targetPath') targetPath: string,
    @Headers('x-migration-secret') secret: string,
  ) {
    if (!secret || secret !== process.env.MIGRATION_SECRET) {
      throw new ForbiddenException();
    }
    const storagePath = process.env.STORAGE_PATH ?? '/data';
    const fullPath = path.join(storagePath, targetPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file.buffer);
    return { ok: true, savedAt: targetPath };
  }
}
