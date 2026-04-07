export type Unsubscribe = () => void | Promise<void>;

export interface MessageBus {
  publish(channel: string, event: unknown): Promise<void>;
  subscribe(channel: string, handler: (event: unknown) => void): Promise<Unsubscribe>;
}
