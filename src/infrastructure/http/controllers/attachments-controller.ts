import type { RouteHandler } from "../compose.ts";
import type { PresignAttachment } from "../../../application/use-cases/attachments/presign-attachment.ts";
import type { ConfirmAttachment } from "../../../application/use-cases/attachments/confirm-attachment.ts";
import { validate } from "../validation/validate.ts";
import { PresignAttachmentSchema } from "../../../application/dtos/attachment-dtos.ts";

interface Deps {
  presignAttachment: PresignAttachment;
  confirmAttachment: ConfirmAttachment;
}

export class AttachmentsController {
  constructor(private readonly deps: Deps) {}

  presign: RouteHandler = async (req, _ctx) => {
    const { contentType, sizeBytes } = validate(PresignAttachmentSchema, await req.json());
    const result = await this.deps.presignAttachment.execute(contentType, sizeBytes);
    return Response.json(result, { status: 201 });
  };

  confirm: RouteHandler = async (req, _ctx) => {
    const key = new URL(req.url).searchParams.get("key");
    if (!key) return Response.json({ error: "Missing key" }, { status: 400 });
    const result = await this.deps.confirmAttachment.execute(key);
    return Response.json(result);
  };
}
