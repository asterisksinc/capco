import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

await loadEnvFile(path.join(repoRoot, ".env"));
await loadEnvFile(path.join(repoRoot, ".env.local"));
await loadEnvFile(path.join(repoRoot, "backend", ".env"));
await loadEnvFile(path.join(repoRoot, "backend", ".env.local"));

const { config } = await import("../lib/config.mjs");

const users = [
  {
    email: "super.admin@capco.local",
    password: "SuperAdmin@1234",
    full_name: "Super Admin",
    role: "super_admin",
  },
  {
    email: "head.operations@capco.local",
    password: "HeadOps@1234",
    full_name: "Head of Operations",
    role: "head_of_operations",
  },
  {
    email: "production.head@capco.local",
    password: "ProdHead@1234",
    full_name: "Production Head",
    role: "production_head",
  },
  {
    email: "person.a@capco.local",
    password: "PersonA@1234",
    full_name: "Person A",
    role: "person_a",
  },
  {
    email: "person.b@capco.local",
    password: "PersonB@1234",
    full_name: "Person B",
    role: "person_b",
  },
  {
    email: "person.c@capco.local",
    password: "PersonC@1234",
    full_name: "Person C",
    role: "person_c",
  },
  {
    email: "person.d@capco.local",
    password: "PersonD@1234",
    full_name: "Person D",
    role: "person_d",
  },
];

async function loadEnvFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const index = trimmed.indexOf("=");
      if (index === -1) continue;

      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore missing env files.
  }
}

async function main() {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env before running the seed script");
  }

  for (const user of users) {
    const created = await fetch(new URL("/auth/v1/admin/users", config.supabaseUrl), {
      method: "POST",
      headers: {
        apikey: config.supabaseServiceRoleKey,
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.full_name,
          role: user.role,
        },
      }),
    });

    const data = await created.json();
    let userId = data?.user?.id || data?.id || null;

    const duplicateUser = !created.ok && String(data?.message || data?.msg || "").toLowerCase().includes("already registered");

    if (duplicateUser) {
      console.log(`Skipped existing auth user: ${user.email}`);
      userId = await findExistingUserId(user.email);
    } else if (!created.ok) {
      throw new Error(`Failed to create auth user ${user.email}: ${JSON.stringify(data)}`);
    }

    if (!userId) {
      userId = await findExistingUserId(user.email);
    }

    console.log(`Synced auth user: ${user.email} (${userId || "missing id"})`);

    const profileUpdate = await fetch(new URL(`/rest/v1/profiles?email=eq.${encodeURIComponent(user.email)}`, config.supabaseUrl), {
      method: "PATCH",
      headers: {
        apikey: config.supabaseServiceRoleKey,
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ auth_user_id: userId }),
    });

    if (!profileUpdate.ok) {
      const payload = await profileUpdate.text();
      throw new Error(`Failed to sync profile for ${user.email}: ${payload}`);
    }
  }
}

async function findExistingUserId(email) {
  const response = await fetch(new URL("/auth/v1/admin/users?per_page=100", config.supabaseUrl), {
    headers: {
      apikey: config.supabaseServiceRoleKey,
      Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      Accept: "application/json",
    },
  });

  const data = await response.json();
  const users = data?.users || data?.data || data || [];
  const match = Array.isArray(users) ? users.find((item) => item?.email === email) : null;
  return match?.id || null;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
