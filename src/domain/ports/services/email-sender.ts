export interface EmailSender {
  sendVerification(to: string, link: string): Promise<void>;
  sendPasswordReset(to: string, link: string): Promise<void>;
}
