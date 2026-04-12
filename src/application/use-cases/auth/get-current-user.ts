import type { UserRepository } from "../../../domain/ports/repositories/user-repository.ts";
import type { PublicUser } from "../../../domain/entities/user.ts";
import { toPublicUser } from "../../../domain/entities/user.ts";
import { NotFoundError } from "../../../domain/errors/domain-errors.ts";

export class GetCurrentUser {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(userId: string): Promise<PublicUser> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError("User not found");
    return toPublicUser(user);
  }
}
