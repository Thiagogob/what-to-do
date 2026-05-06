import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class StorageService {
  private storagePath: string;

  constructor(private readonly configService: ConfigService) {
    this.storagePath = configService.get<string>('STORAGE_PATH') ?? '/data';
  }

  async uploadFile(buffer: Buffer, destinationPath: string, _contentType: string): Promise<string> {
    const fullPath = path.join(this.storagePath, destinationPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return `/uploads/${destinationPath}`;
  }

  async deleteFile(destinationPath: string): Promise<void> {
    const fullPath = path.join(this.storagePath, destinationPath);
    await fs.unlink(fullPath).catch(() => {});
  }

  async downloadFileAsBuffer(sourcePath: string): Promise<Buffer> {
    const fullPath = path.join(this.storagePath, sourcePath);
    try {
      return await fs.readFile(fullPath);
    } catch {
      throw new NotFoundException(`File not found: ${sourcePath}`);
    }
  }
}
