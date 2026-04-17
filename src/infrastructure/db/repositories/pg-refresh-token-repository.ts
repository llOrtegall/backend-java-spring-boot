import type { SQL } from "bun";
import type { RefreshTokenRepository } from "../../../domain/ports/repositories/refresh-token-repository.ts";
import type { RefreshToken } from "../../../domain/entities/refresh-token.ts";

type Row = {
  id: string;
  user_id: string;
  token_hash: string;
  family_id: string;
  parent_id: string | null;
  replaced_by_id: string | null;
  user_agent: string | null;
  ip: string | null;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
};

function mapRow(r: Row): RefreshToken {
  return {
    id: r.id,
    userId: r.user_id,
    tokenHash: r.token_hash,
    familyId: r.family_id,
    parentId: r.parent_id,
    replacedById: r.replaced_by_id,
    userAgent: r.user_agent,
    ip: r.ip,
    expiresAt: r.expires_at,
    revokedAt: r.revoked_at,
    createdAt: r.created_at,
  };
}

export class PgRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly sql: SQL) {}

  async insert(record: Omit<RefreshToken, "createdAt">): Promise<void> {
    await this.sql`
      INSERT INTO refresh_tokens
        (id, user_id, token_hash, family_id, parent_id, replaced_by_id,
         user_agent, ip, expires_at, revoked_at)
      VALUES
        (${record.id}, ${record.userId}, ${record.tokenHash}, ${record.familyId},
         ${record.parentId}, ${record.replacedById}, ${record.userAgent},
         ${record.ip}::inet, ${record.expiresAt}, ${record.revokedAt})
    `;
  }

  async findById(id: string): Promise<RefreshToken | null> {
    const [row] = await this.sql<Row[]>`SELECT * FROM refresh_tokens WHERE id = ${id}`;
    return row ? mapRow(row) : null;
  }

  async findByHash(hash: string): Promise<RefreshToken | null> {
    const [row] = await this.sql<Row[]>`
      SELECT * FROM refresh_tokens WHERE token_hash = ${hash}
    `;
    return row ? mapRow(row) : null;
  }

  async markRevoked(id: string, replacedById?: string): Promise<void> {
    await this.sql`
      UPDATE refresh_tokens
      SET revoked_at = now(), replaced_by_id = ${replacedById ?? null}
      WHERE id = ${id}
    `;
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.sql`
      UPDATE refresh_tokens
      SET revoked_at = now()
      WHERE family_id = ${familyId} AND revoked_at IS NULL
    `;
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.sql`
      UPDATE refresh_tokens
      SET revoked_at = now()
      WHERE user_id = ${userId} AND revoked_at IS NULL
    `;
  }

  async listActiveByUser(userId: string): Promise<RefreshToken[]> {
    const rows = await this.sql<Row[]>`
      SELECT * FROM refresh_tokens
      WHERE user_id = ${userId} AND revoked_at IS NULL AND expires_at > now()
      ORDER BY created_at DESC
    `;
    return rows.map(mapRow);
  }
}
