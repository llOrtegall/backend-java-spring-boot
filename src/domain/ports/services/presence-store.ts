export interface PresenceStore {
  markOnline(userId: string, connId: string, ttlSec: number): Promise<void>;
  markOffline(userId: string, connId: string): Promise<void>;
  heartbeat(userId: string, connId: string, ttlSec: number): Promise<void>;
  isOnline(userId: string): Promise<boolean>;
  listOnline(userIds: string[]): Promise<string[]>;
}
