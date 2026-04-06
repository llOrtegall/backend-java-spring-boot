import type { EmailToken, EmailTokenKind } from "../../entities/email-token.ts";

export interface EmailTokenRepository {
  insert(record: Omit<EmailToken, "usedAt">): Promise<void>;
  consume(hash: string, kind: EmailTokenKind): Promise<EmailToken | null>;
}
