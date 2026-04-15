import type { RefreshToken } from "../../entities/refresh-token.ts";

export interface RefreshTokenRepository {
  insert(record: Omit<RefreshToken, "createdAt">): Promise<void>;
  findById(id: string): Promise<RefreshToken | null>;
  findByHash(hash: string): Promise<RefreshToken | null>;
  markRevoked(id: string, replacedById?: string): Promise<void>;
  revokeFamily(familyId: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  listActiveByUser(userId: string): Promise<RefreshToken[]>;
}
