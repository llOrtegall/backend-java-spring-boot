
# Chat Backend — Estado del proyecto

Plan detallado completo en: `~/.claude/plans/vale-mira-est-servicio-federated-goose.md`

## Progreso de fases

- [x] **Fase 0 — Setup** — env, logger, migrator, docker-compose, `/health`, `/ready`
- [x] **Fase 1 — Auth REST** — register, login, refresh (rotación + detección de reuso), logout, /me, verify-email, password-reset. JWT (jose) + argon2id + refresh opaco hasheado con pepper. Cookie httpOnly para web, body para mobile.
- [ ] **Fase 2 — Users + Rooms REST** — `0002_rooms.sql`, `pg-room-repository`, use-cases users (get, update-profile) y rooms (create-dm, create-group, add-member, remove-member, list-my-rooms, get-room)
- [ ] **Fase 3 — WebSocket + Messages** — `redis-message-bus`, `connection-registry` con refcount, `event-router`, handlers de chat, use-cases messages, REST fallback messages
- [ ] **Fase 4 — Presence + Typing + Read receipts** — `redis-presence-store`, heartbeat, online/offline, chat.typing, chat.read
- [ ] **Fase 5 — Attachments** — `s3-object-storage` (R2/MinIO), presign PUT, confirm, `chat.send` con attachmentKey
- [ ] **Fase 6 — Hardening + tests** — rate limit Redis, security headers, pino redact, graceful shutdown, suite integration

## Stack de decisiones clave

- **Runtime**: Bun — `Bun.serve`, `Bun.sql` (Postgres), `Bun.redis`, `Bun.password`, `bun:test`
- **Arquitectura**: Hexagonal/Clean (`domain` / `application` / `infrastructure`)
- **Auth**: JWT access HS256 (~15min) + refresh opaco rotado (~30d), pepper+sha256 en DB
- **Real-time**: multi-instancia con Redis pub/sub, canal `room:{roomId}` por sala
- **WS protocol**: envelope JSON `{type, id?, refId?, payload, ts}`, auth por `?token=<jwt>`
- **IDs**: UUIDv7 propio (`infrastructure/crypto/uuidv7.ts`) — sortable, cursor pagination
- **Validación**: Zod v4
- **Storage**: Cloudflare R2 / MinIO local vía S3 SDK, presigned PUT (cliente sube directo)
- **Email**: mock `ConsoleEmailSender` (loguea link a consola)
- **Dev infra**: `docker-compose.dev.yml` — Postgres 16 + Redis 7 + MinIO

## Comandos útiles

```bash
sudo docker compose -f docker-compose.dev.yml up -d   # levantar servicios
bun run migrate                                        # correr migraciones
bun run dev                                            # servidor con hot reload
bun test                                               # todos los tests
```

---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
