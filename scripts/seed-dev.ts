import { migrate } from "../src/infrastructure/db/migrator.ts";
import { sql } from "../src/infrastructure/db/client.ts";
import { BunPasswordHasher } from "../src/infrastructure/crypto/bun-password-hasher.ts";
import { uuidv7 } from "../src/infrastructure/crypto/uuidv7.ts";

await migrate();

const hasher = new BunPasswordHasher();

const users = [
  { email: "alice@dev.local", displayName: "Alice Dev" },
  { email: "bob@dev.local", displayName: "Bob Dev" },
  { email: "carol@dev.local", displayName: "Carol Dev" },
];

const passwordHash = await hasher.hash("password123");
const now = new Date();

const inserted: Array<{ id: string; email: string }> = [];

for (const u of users) {
  const id = uuidv7();
  await sql`
    INSERT INTO users (id, email, password_hash, display_name, email_verified_at)
    VALUES (${id}, ${u.email}, ${passwordHash}, ${u.displayName}, ${now})
    ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id
  `;
  inserted.push({ id, email: u.email });
  console.log(`  ✓ user: ${u.email}`);
}

// Create a group room with all users
const roomId = uuidv7();
const [alice, bob, carol] = inserted as [typeof inserted[0], typeof inserted[0], typeof inserted[0]];

await sql`
  INSERT INTO rooms (id, kind, name, created_by)
  VALUES (${roomId}, 'group', 'Dev Team', ${alice.id})
  ON CONFLICT DO NOTHING
`;

for (const [i, u] of inserted.entries()) {
  await sql`
    INSERT INTO room_members (room_id, user_id, role)
    VALUES (${roomId}, ${u.id}, ${i === 0 ? "owner" : "member"})
    ON CONFLICT DO NOTHING
  `;
}
console.log(`  ✓ group room: "Dev Team" (${roomId})`);

// Create a DM between Alice and Bob
const dmKey = [alice.id, bob.id].sort().join(":");
const dmId = uuidv7();
await sql`
  INSERT INTO rooms (id, kind, created_by, dm_key)
  VALUES (${dmId}, 'dm', ${alice.id}, ${dmKey})
  ON CONFLICT (dm_key) DO NOTHING
`;
await sql`
  INSERT INTO room_members (room_id, user_id, role)
  VALUES (${dmId}, ${alice.id}, 'member'), (${dmId}, ${bob.id}, 'member')
  ON CONFLICT DO NOTHING
`;
console.log(`  ✓ DM: alice ↔ bob (${dmId})`);

console.log("\nSeed complete. Users: alice/bob/carol@dev.local — password: password123");
await sql.end();
