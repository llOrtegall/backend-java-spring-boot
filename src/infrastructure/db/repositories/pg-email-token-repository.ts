import type { SQL } from "bun";
import type { EmailTokenRepository } from "../../../domain/ports/repositories/email-token-repository.ts";
import type { EmailToken, EmailTokenKind } from "../../../domain/entities/email-token.ts";

type Row = {
  id: string;
  user_id: string;
  kind: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
};

function mapRow(r: Row): EmailToken {
  return {
    id: r.id,
    userId: r.user_id,
    kind: r.kind as EmailTokenKind,
    tokenHash: r.token_hash,
    expiresAt: r.expires_at,
    usedAt: r.used_at,
  };
}

export class PgEmailTokenRepository implements EmailTokenRepository {
  constructor(private readonly sql: SQL) {}

  async insert(record: Omit<EmailToken, "usedAt">): Promise<void> {
    await this.sql`
      INSERT INTO email_tokens (id, user_id, kind, token_hash, expires_at)
      VALUES (${record.id}, ${record.userId}, ${record.kind}, ${record.tokenHash}, ${record.expiresAt})
    `;
  }

  async consume(hash: string, kind: EmailTokenKind): Promise<EmailToken | null> {
    const [row] = await this.sql<Row[]>`
      UPDATE email_tokens
      SET used_at = now()
      WHERE token_hash = ${hash}
        AND kind = ${kind}
        AND used_at IS NULL
        AND expires_at > now()
      RETURNING *
    `;
    return row ? mapRow(row) : null;
  }
}
