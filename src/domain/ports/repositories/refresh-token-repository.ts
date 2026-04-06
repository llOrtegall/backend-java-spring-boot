import type { RefreshToken } from "../../entities/refresh-token.ts";

export interface RefreshTokenRepository {
  insert(record: Omit<RefreshToken, "createdAt">): Promise<void>;
  findByHash(hash: string): Promise<RefreshToken | null>;
  markRevoked(id: string, replacedById?: string): Promise<void>;
  revokeFamily(familyId: string): Promise<void>;
  listActiveByUser(userId: string): Promise<RefreshToken[]>;
}
