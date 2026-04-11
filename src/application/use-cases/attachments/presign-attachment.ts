import type { ObjectStorage, PresignedPut } from "../../../domain/ports/services/object-storage.ts";
import type { IdGenerator } from "../../../domain/ports/services/id-generator.ts";

interface Deps {
  objectStorage: ObjectStorage;
  idGenerator: IdGenerator;
}

const PRESIGN_TTL_SEC = 300; // 5 minutes to complete the upload
const SIZE_MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export class PresignAttachment {
  constructor(private readonly deps: Deps) {}

  async execute(contentType: string, sizeBytes: number): Promise<PresignedPut & { publicUrl: string }> {
    const ext = contentType.split("/")[1] ?? "bin";
    const key = `uploads/${this.deps.idGenerator.uuidv7()}.${ext}`;
    const presigned = await this.deps.objectStorage.presignPut(key, contentType, sizeBytes, PRESIGN_TTL_SEC);
    return { ...presigned, publicUrl: this.deps.objectStorage.publicUrl(key) };
  }
}
