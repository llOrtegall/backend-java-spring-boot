import { z } from "zod";
import { ValidationError } from "../../../domain/errors/domain-errors.ts";

export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues
      .map(e => `${e.path.join(".") || "body"}: ${e.message}`)
      .join("; ");
    throw new ValidationError(message);
  }
  return result.data;
}
