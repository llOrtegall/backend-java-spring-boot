import { SignJWT, jwtVerify } from "jose";
import type { TokenSigner, AccessTokenClaims } from "../../domain/ports/services/token-signer.ts";
import { sha256Sync } from "../crypto/sha256.ts";

export class JoseTokenSigner implements TokenSigner {
  private readonly accessSecret: Uint8Array;

  constructor(
    private readonly config: { accessSecret: string; accessTtlSec: number; refreshPepper: string },
  ) {
    this.accessSecret = new TextEncoder().encode(config.accessSecret);
  }

  async signAccess(claims: AccessTokenClaims): Promise<string> {
    return new SignJWT({ sub: claims.sub, jti: claims.jti })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + this.config.accessTtlSec)
      .sign(this.accessSecret);
  }

  async verifyAccess(token: string): Promise<AccessTokenClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.accessSecret);
      if (typeof payload.sub !== "string" || typeof payload.jti !== "string") return null;
      return { sub: payload.sub, jti: payload.jti };
    } catch {
      return null;
    }
  }

  generateRefresh(): { raw: string; hash: string } {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const raw = Buffer.from(bytes).toString("base64url");
    const hash = sha256Sync(this.config.refreshPepper + raw);
    return { raw, hash };
  }
}
