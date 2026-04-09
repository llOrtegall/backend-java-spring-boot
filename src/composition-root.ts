import { env } from "./infrastructure/config/env.ts";
import { logger } from "./infrastructure/logging/logger.ts";
import { sql } from "./infrastructure/db/client.ts";
import { redisPublisher, redisSubscriber } from "./infrastructure/redis/client.ts";

import { JoseTokenSigner } from "./infrastructure/jwt/jose-token-signer.ts";
import { BunPasswordHasher } from "./infrastructure/crypto/bun-password-hasher.ts";
import { ConsoleEmailSender } from "./infrastructure/email/console-email-sender.ts";
import { SystemClock } from "./infrastructure/services/system-clock.ts";
import { SystemIdGenerator } from "./infrastructure/services/system-id-generator.ts";
import { RedisRateLimiter } from "./infrastructure/redis/redis-rate-limiter.ts";

import { PgUserRepository } from "./infrastructure/db/repositories/pg-user-repository.ts";
import { PgRefreshTokenRepository } from "./infrastructure/db/repositories/pg-refresh-token-repository.ts";
import { PgEmailTokenRepository } from "./infrastructure/db/repositories/pg-email-token-repository.ts";
import { PgRoomRepository } from "./infrastructure/db/repositories/pg-room-repository.ts";
import { PgMessageRepository } from "./infrastructure/db/repositories/pg-message-repository.ts";
import { RedisMessageBus } from "./infrastructure/redis/redis-message-bus.ts";

import { RegisterUser } from "./application/use-cases/auth/register-user.ts";
import { LoginUser } from "./application/use-cases/auth/login-user.ts";
import { RefreshSession } from "./application/use-cases/auth/refresh-session.ts";
import { RevokeSession } from "./application/use-cases/auth/revoke-session.ts";
import { GetCurrentUser } from "./application/use-cases/auth/get-current-user.ts";
import { RequestEmailVerification } from "./application/use-cases/auth/request-email-verification.ts";
import { ConfirmEmailVerification } from "./application/use-cases/auth/confirm-email-verification.ts";
import { RequestPasswordReset } from "./application/use-cases/auth/request-password-reset.ts";
import { ConfirmPasswordReset } from "./application/use-cases/auth/confirm-password-reset.ts";

import { GetUser } from "./application/use-cases/users/get-user.ts";
import { UpdateProfile } from "./application/use-cases/users/update-profile.ts";

import { RoomAuthorizer } from "./application/services/room-authorizer.ts";
import { CreateDirectRoom } from "./application/use-cases/rooms/create-direct-room.ts";
import { CreateGroupRoom } from "./application/use-cases/rooms/create-group-room.ts";
import { AddMember } from "./application/use-cases/rooms/add-member.ts";
import { RemoveMember } from "./application/use-cases/rooms/remove-member.ts";
import { ListMyRooms } from "./application/use-cases/rooms/list-my-rooms.ts";
import { GetRoom } from "./application/use-cases/rooms/get-room.ts";

import { SendMessage } from "./application/use-cases/messages/send-message.ts";
import { EditMessage } from "./application/use-cases/messages/edit-message.ts";
import { DeleteMessage } from "./application/use-cases/messages/delete-message.ts";
import { ListMessages } from "./application/use-cases/messages/list-messages.ts";
import { MarkAsRead } from "./application/use-cases/messages/mark-as-read.ts";

import { AuthController } from "./infrastructure/http/controllers/auth-controller.ts";
import { UsersController } from "./infrastructure/http/controllers/users-controller.ts";
import { RoomsController } from "./infrastructure/http/controllers/rooms-controller.ts";
import { MessagesController } from "./infrastructure/http/controllers/messages-controller.ts";
import { ConnectionRegistry } from "./infrastructure/ws/connection-registry.ts";
import { EventRouter } from "./infrastructure/ws/event-router.ts";
import { WsGateway } from "./infrastructure/ws/gateway.ts";

import type { TokenSigner } from "./domain/ports/services/token-signer.ts";
import type { RateLimiter } from "./domain/ports/services/rate-limiter.ts";

export interface AppContext {
  auth: AuthController;
  users: UsersController;
  rooms: RoomsController;
  messages: MessagesController;
  gateway: WsGateway;
  tokenSigner: TokenSigner;
  rateLimiter: RateLimiter;
}

export function buildApp(): AppContext {
  const tokenSigner = new JoseTokenSigner({
    accessSecret: env.JWT_ACCESS_SECRET,
    accessTtlSec: env.ACCESS_TTL,
    refreshPepper: env.JWT_REFRESH_PEPPER,
  });
  const passwordHasher = new BunPasswordHasher();
  const emailSender = new ConsoleEmailSender(logger);
  const clock = new SystemClock();
  const idGenerator = new SystemIdGenerator();
  const rateLimiter = new RedisRateLimiter(redisPublisher);

  const userRepo = new PgUserRepository(sql);
  const refreshTokenRepo = new PgRefreshTokenRepository(sql);
  const emailTokenRepo = new PgEmailTokenRepository(sql);
  const roomRepo = new PgRoomRepository(sql);
  const messageRepo = new PgMessageRepository(sql);
  const bus = new RedisMessageBus(redisPublisher, redisSubscriber);

  const sessionDeps = {
    refreshTokenRepo,
    tokenSigner,
    idGenerator,
    clock,
    refreshTtlSec: env.REFRESH_TTL,
  };

  const registerUser = new RegisterUser({
    ...sessionDeps,
    userRepo,
    passwordHasher,
    emailTokenRepo,
    emailSender,
    emailVerifyUrlBase: env.EMAIL_VERIFY_URL_BASE,
  });

  const loginUser = new LoginUser({
    ...sessionDeps,
    userRepo,
    passwordHasher,
  });

  const refreshSession = new RefreshSession({
    refreshTokenRepo,
    tokenSigner,
    idGenerator,
    clock,
    refreshTtlSec: env.REFRESH_TTL,
    refreshPepper: env.JWT_REFRESH_PEPPER,
  });

  const revokeSession = new RevokeSession(refreshTokenRepo, env.JWT_REFRESH_PEPPER);
  const getCurrentUser = new GetCurrentUser(userRepo);

  const requestEmailVerification = new RequestEmailVerification({
    userRepo,
    emailTokenRepo,
    emailSender,
    idGenerator,
    clock,
    emailVerifyUrlBase: env.EMAIL_VERIFY_URL_BASE,
  });

  const confirmEmailVerification = new ConfirmEmailVerification(emailTokenRepo, userRepo, clock);

  const requestPasswordReset = new RequestPasswordReset({
    userRepo,
    emailTokenRepo,
    emailSender,
    idGenerator,
    clock,
    emailResetUrlBase: env.EMAIL_RESET_URL_BASE,
  });

  const confirmPasswordReset = new ConfirmPasswordReset({
    emailTokenRepo,
    userRepo,
    refreshTokenRepo,
    passwordHasher,
  });

  const auth = new AuthController({
    registerUser,
    loginUser,
    refreshSession,
    revokeSession,
    getCurrentUser,
    requestEmailVerification,
    confirmEmailVerification,
    requestPasswordReset,
    confirmPasswordReset,
  });

  const getUser = new GetUser(userRepo);
  const updateProfile = new UpdateProfile(userRepo);
  const users = new UsersController({ getUser, updateProfile });

  const roomAuthorizer = new RoomAuthorizer(roomRepo);
  const createDirectRoom = new CreateDirectRoom({ roomRepo, userRepo, idGenerator, clock });
  const createGroupRoom = new CreateGroupRoom({ roomRepo, userRepo, idGenerator, clock });
  const addMember = new AddMember({ roomRepo, userRepo, clock, authorizer: roomAuthorizer });
  const removeMember = new RemoveMember({ roomRepo, authorizer: roomAuthorizer });
  const listMyRooms = new ListMyRooms(roomRepo);
  const getRoom = new GetRoom({ roomRepo, authorizer: roomAuthorizer });

  const rooms = new RoomsController({
    createDirectRoom,
    createGroupRoom,
    addMember,
    removeMember,
    listMyRooms,
    getRoom,
  });

  const sendMessage = new SendMessage({ messageRepo, roomRepo, bus, idGenerator, clock });
  const editMessage = new EditMessage({ messageRepo, bus, clock });
  const deleteMessage = new DeleteMessage({ messageRepo, roomRepo, bus });
  const listMessages = new ListMessages({ messageRepo, roomRepo });
  const markAsRead = new MarkAsRead({ messageRepo, roomRepo, bus });

  const messagesCtrl = new MessagesController({
    sendMessage,
    editMessage,
    deleteMessage,
    listMessages,
  });

  const registry = new ConnectionRegistry(bus);
  const router = new EventRouter({
    registry,
    roomRepo,
    bus,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
  });
  const gateway = new WsGateway(registry, router, tokenSigner, idGenerator);

  return { auth, users, rooms, messages: messagesCtrl, gateway, tokenSigner, rateLimiter };
}
