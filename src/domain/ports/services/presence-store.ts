export interface PresenceStore {
  markOnline(userId: string, connId: string, ttlSec: number): Promise<void>;
  /** Returns true if the connection existed and was removed. */
  markOffline(userId: string, connId: string): Promise<boolean>;
  heartbeat(userId: string, connId: string, ttlSec: number): Promise<void>;
  isOnline(userId: string): Promise<boolean>;
  listOnline(userIds: string[]): Promise<string[]>;
}
