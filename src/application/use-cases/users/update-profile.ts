import type { UserRepository } from "../../../domain/ports/repositories/user-repository.ts";
import { toPublicUser, type PublicUser } from "../../../domain/entities/user.ts";
import type { UpdateProfileInput } from "../../dtos/user-dtos.ts";

export class UpdateProfile {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
    const patch: Parameters<UserRepository["update"]>[1] = {};
    if (input.displayName !== undefined) patch.displayName = input.displayName;
    if (input.avatarUrl !== undefined) patch.avatarUrl = input.avatarUrl;

    const user = await this.userRepo.update(userId, patch);
    return toPublicUser(user);
  }
}
