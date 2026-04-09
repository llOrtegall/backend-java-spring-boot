import type { UserRepository } from "../../../domain/ports/repositories/user-repository.ts";
import { toPublicUser, type PublicUser } from "../../../domain/entities/user.ts";
import { NotFoundError } from "../../../domain/errors/domain-errors.ts";

export class GetUser {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(id: string): Promise<PublicUser> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundError("User not found");
    return toPublicUser(user);
  }
}
