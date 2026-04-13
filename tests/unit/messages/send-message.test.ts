import { describe, test, expect } from "bun:test";
import { SendMessage } from "../../../src/application/use-cases/messages/send-message.ts";
import {
  InMemoryRoomRepo,
  InMemoryMessageRepo,
  FakeMessageBus,
  FakeClock,
  FakeIdGenerator,
  FakeObjectStorage,
} from "../../helpers/fakes.ts";

function makeSut() {
  const roomRepo = new InMemoryRoomRepo();
  const messageRepo = new InMemoryMessageRepo();
  const bus = new FakeMessageBus();
  const clock = new FakeClock();
  const idGenerator = new FakeIdGenerator();
  const objectStorage = new FakeObjectStorage();

  const sut = new SendMessage({ messageRepo, roomRepo, bus, idGenerator, clock, objectStorage });
  return { sut, roomRepo, messageRepo, bus, objectStorage };
}

const ROOM_ID = "room-00000000-0000-7000-8000-000000000001";
const USER_A = "user-00000000-0000-7000-8000-000000000002";

async function seedRoomMember(roomRepo: InMemoryRoomRepo) {
  await roomRepo.createGroup(
    { id: ROOM_ID, kind: "group", name: "Test", createdBy: USER_A, dmKey: null, lastMessageAt: null, createdAt: new Date() },
    { roomId: ROOM_ID, userId: USER_A, role: "owner", joinedAt: new Date(), lastReadMessageId: null, mutedUntil: null },
  );
}

describe("SendMessage", () => {
  test("persists message and publishes bus event", async () => {
    const { sut, roomRepo, bus } = makeSut();
    await seedRoomMember(roomRepo);

    const msg = await sut.execute({ roomId: ROOM_ID, senderId: USER_A, body: "Hello!" });

    expect(msg.body).toBe("Hello!");
    expect(msg.roomId).toBe(ROOM_ID);
    expect(bus.published.length).toBe(1);
    expect(bus.published[0]!.channel).toBe(`room:${ROOM_ID}`);
    const event = bus.published[0]!.event as { kind: string };
    expect(event.kind).toBe("message.created");
  });

  test("throws ForbiddenError when sender is not a member", async () => {
    const { sut } = makeSut();
    expect(sut.execute({ roomId: ROOM_ID, senderId: USER_A, body: "Hi" })).rejects.toThrow(
      "Not a member of this room",
    );
  });

  test("throws ConflictError when attachmentKey object does not exist in storage", async () => {
    const { sut, roomRepo } = makeSut();
    await seedRoomMember(roomRepo);

    expect(
      sut.execute({ roomId: ROOM_ID, senderId: USER_A, body: "", attachmentKey: "uploads/nonexistent.jpg" }),
    ).rejects.toThrow("Attachment not found");
  });

  test("accepts message with existing attachment", async () => {
    const { sut, roomRepo, objectStorage } = makeSut();
    await seedRoomMember(roomRepo);
    objectStorage.simulateUpload("uploads/photo.jpg");

    const msg = await sut.execute({ roomId: ROOM_ID, senderId: USER_A, body: "", attachmentKey: "uploads/photo.jpg" });
    expect(msg.attachmentKey).toBe("uploads/photo.jpg");
  });

  test("idempotent: same clientMessageId returns same message", async () => {
    const { sut, roomRepo } = makeSut();
    await seedRoomMember(roomRepo);

    const first = await sut.execute({ roomId: ROOM_ID, senderId: USER_A, body: "Hi", clientMessageId: "cli-1" });
    const second = await sut.execute({ roomId: ROOM_ID, senderId: USER_A, body: "Hi", clientMessageId: "cli-1" });
    expect(first.id).toBe(second.id);
  });
});
