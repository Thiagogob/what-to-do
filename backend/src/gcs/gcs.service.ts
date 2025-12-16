// backend/src/gcs/gcs.service.ts
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

// Inicializa o cliente GCS.
// Ele usa as credenciais que o Cloud Run/GCP injeta automaticamente.
const storage = new Storage();

@Injectable()
export class GcsService {
  private bucketName: string;

constructor(private readonly configService: ConfigService) {
    const bucket = this.configService.get<string>('BUCKET_NAME');

    if (!bucket) {
      // 2. Verificação de nulidade: Se for undefined, lançamos um erro.
      throw new InternalServerErrorException(
        'BUCKET_NAME deve ser definido no ambiente. O GcsService não pode inicializar.'
      );
    }
    // 3. Atribuição: Como a verificação acima garante que 'bucket' é string,
    // a atribuição é segura.
    this.bucketName = bucket; 
  }

  /**
   * Faz o upload de um arquivo (Buffer) para o Google Cloud Storage.
   * @param fileBuffer O buffer do arquivo (vindo do Multer memoryStorage).
   * @param destinationPath O caminho do arquivo dentro do bucket (ex: 'photos/idDoUsuario/nome.jpg').
   * @param contentType O tipo MIME do arquivo (ex: 'image/jpeg').
   * @returns O URL público do arquivo.
   */
  async uploadFile(
    fileBuffer: Buffer, 
    destinationPath: string, 
    contentType: string
  ): Promise<string> {
    const bucket = storage.bucket(this.bucketName);
    const file = bucket.file(destinationPath);

    // Cria um stream para o upload
    const passthroughStream = new Readable();
    passthroughStream.push(fileBuffer);
    passthroughStream.push(null); // Sinaliza o fim do stream

    return new Promise((resolve, reject) => {
      const writeStream = file.createWriteStream({
        metadata: {
          contentType: contentType,
          // Cache-Control: Aumenta o desempenho e reduz custos
          cacheControl: 'public, max-age=31536000',
        },
        // Garante que o arquivo será público para leitura (se o bucket permitir)
        public: true, 
      });

      passthroughStream.pipe(writeStream)
        .on('error', (err) => reject(err))
        .on('finish', () => {
          // O URL público do arquivo após o upload
          const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${destinationPath}`;
          resolve(publicUrl);
        });
    });
  }

  async deleteFile(destinationPath: string): Promise<void> {
    const bucket = storage.bucket(this.bucketName);
    const file = bucket.file(destinationPath);
    
    // Deleta o arquivo. O 'ignoreNotFound: true' evita falha se o arquivo já não existir.
    await file.delete({ ignoreNotFound: true });
  }

  async downloadFileAsBuffer(sourcePath: string): Promise<Buffer> {
    const bucket = storage.bucket(this.bucketName);
    const file = bucket.file(sourcePath);

    try {
        const [buffer] = await file.download();
        return buffer;
    } catch (e) {
        // Se o arquivo não for encontrado no GCS, lança 404
        if (e.code === 404) {
            throw new NotFoundException(`Arquivo não encontrado no GCS: ${sourcePath}`);
        }
        throw e;
    }
}
}