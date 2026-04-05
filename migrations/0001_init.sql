CREATE TABLE users (
  id                UUID        PRIMARY KEY,
  email             TEXT        UNIQUE NOT NULL,
  password_hash     TEXT        NOT NULL,
  display_name      TEXT        NOT NULL,
  avatar_url        TEXT,
  email_verified_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id             UUID        PRIMARY KEY,
  user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash     TEXT        UNIQUE NOT NULL,
  family_id      UUID        NOT NULL,
  parent_id      UUID        REFERENCES refresh_tokens(id),
  replaced_by_id UUID        REFERENCES refresh_tokens(id),
  user_agent     TEXT,
  ip             INET,
  expires_at     TIMESTAMPTZ NOT NULL,
  revoked_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rt_user ON refresh_tokens(user_id, revoked_at);
CREATE INDEX idx_rt_family ON refresh_tokens(family_id);

CREATE TABLE email_tokens (
  id         UUID        PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT        NOT NULL CHECK (kind IN ('verify', 'reset')),
  token_hash TEXT        UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ
);

CREATE INDEX idx_email_tokens_user_kind ON email_tokens(user_id, kind);
