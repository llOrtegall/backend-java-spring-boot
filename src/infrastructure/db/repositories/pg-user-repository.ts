import type { SQL } from "bun";
import type { UserRepository } from "../../../domain/ports/repositories/user-repository.ts";
import type { User } from "../../../domain/entities/user.ts";

type Row = {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  avatar_url: string | null;
  email_verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function mapRow(r: Row): User {
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    emailVerifiedAt: r.email_verified_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export class PgUserRepository implements UserRepository {
  constructor(private readonly sql: SQL) {}

  async create(data: Omit<User, "createdAt" | "updatedAt">): Promise<User> {
    const [row] = await this.sql<Row[]>`
      INSERT INTO users (id, email, password_hash, display_name, avatar_url, email_verified_at)
      VALUES (${data.id}, ${data.email}, ${data.passwordHash}, ${data.displayName},
              ${data.avatarUrl}, ${data.emailVerifiedAt})
      RETURNING *
    `;
    return mapRow(row!);
  }

  async findById(id: string): Promise<User | null> {
    const [row] = await this.sql<Row[]>`SELECT * FROM users WHERE id = ${id}`;
    return row ? mapRow(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.sql<Row[]>`SELECT * FROM users WHERE email = ${email}`;
    return row ? mapRow(row) : null;
  }

  async listAll(excludeId: string): Promise<User[]> {
    const rows = await this.sql<Row[]>`
      SELECT * FROM users WHERE id != ${excludeId} ORDER BY display_name
    `;
    return rows.map(mapRow);
  }

  async update(
    id: string,
    patch: Partial<Pick<User, "displayName" | "avatarUrl" | "emailVerifiedAt" | "passwordHash">>,
  ): Promise<User> {
    const updates: Record<string, unknown> = {};
    if (patch.displayName !== undefined) updates.display_name = patch.displayName;
    if (patch.avatarUrl !== undefined) updates.avatar_url = patch.avatarUrl;
    if (patch.emailVerifiedAt !== undefined) updates.email_verified_at = patch.emailVerifiedAt;
    if (patch.passwordHash !== undefined) updates.password_hash = patch.passwordHash;

    const [row] = await this.sql<Row[]>`
      UPDATE users SET ${this.sql(updates)}, updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;
    return mapRow(row!);
  }
}
