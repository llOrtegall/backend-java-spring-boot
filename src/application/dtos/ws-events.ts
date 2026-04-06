import { z } from "zod";

export const WsEnvelopeSchema = z.object({
  type: z.string(),
  id: z.string().optional(),
  refId: z.string().optional(),
  payload: z.unknown().optional(),
  ts: z.number().optional(),
});
export type WsEnvelope = z.infer<typeof WsEnvelopeSchema>;

export const ChatSubscribePayloadSchema = z.object({
  roomIds: z.array(z.string().uuid()).min(1).max(50),
});

export const ChatUnsubscribePayloadSchema = z.object({
  roomIds: z.array(z.string().uuid()).min(1).max(50),
});

export const ChatSendPayloadSchema = z.object({
  roomId: z.string().uuid(),
  body: z.string().max(4096).default(""),
  attachmentKey: z.string().max(512).optional(),
  clientMessageId: z.string().max(128).optional(),
});

export const ChatEditPayloadSchema = z.object({
  messageId: z.string().uuid(),
  body: z.string().min(1).max(4096),
});

export const ChatDeletePayloadSchema = z.object({
  messageId: z.string().uuid(),
});

export const ChatReadPayloadSchema = z.object({
  roomId: z.string().uuid(),
  messageId: z.string().uuid(),
});

export const ChatTypingPayloadSchema = z.object({
  roomId: z.string().uuid(),
});
