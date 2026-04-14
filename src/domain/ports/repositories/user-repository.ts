import type { User } from "../../entities/user.ts";

export interface UserRepository {
  create(data: Omit<User, "createdAt" | "updatedAt">): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(
    id: string,
    patch: Partial<Pick<User, "displayName" | "avatarUrl" | "emailVerifiedAt" | "passwordHash">>,
  ): Promise<User>;
  listAll(excludeId: string): Promise<User[]>;
}
