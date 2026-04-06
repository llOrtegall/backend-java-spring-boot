export interface AccessTokenClaims {
  sub: string;
  jti: string;
}

export interface TokenSigner {
  signAccess(claims: AccessTokenClaims): Promise<string>;
  verifyAccess(token: string): Promise<AccessTokenClaims | null>;
  generateRefresh(): { raw: string; hash: string };
}
