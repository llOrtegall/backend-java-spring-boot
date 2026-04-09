import type { EmailSender } from "../../domain/ports/services/email-sender.ts";
import type { Logger } from "../logging/logger.ts";

export class ConsoleEmailSender implements EmailSender {
  constructor(private readonly logger: Logger) {}

  async sendVerification(to: string, link: string): Promise<void> {
    this.logger.info({ to, link }, "[EMAIL] Verification link");
  }

  async sendPasswordReset(to: string, link: string): Promise<void> {
    this.logger.info({ to, link }, "[EMAIL] Password reset link");
  }
}
