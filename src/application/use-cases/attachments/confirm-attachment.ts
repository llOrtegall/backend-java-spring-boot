import type { ObjectStorage } from "../../../domain/ports/services/object-storage.ts";
import { NotFoundError } from "../../../domain/errors/domain-errors.ts";

export class ConfirmAttachment {
  constructor(private readonly objectStorage: ObjectStorage) {}

  async execute(key: string): Promise<{ publicUrl: string }> {
    const exists = await this.objectStorage.headObject(key);
    if (!exists) throw new NotFoundError("Attachment not found or not yet uploaded");
    return { publicUrl: this.objectStorage.publicUrl(key) };
  }
}
