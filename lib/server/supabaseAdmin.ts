import { NextResponse } from "next/server";

export const supabaseAdminConfig = {
  url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  anonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
};

export function missingSupabaseAdminResponse() {
  return NextResponse.json(
    { ok: false, message: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set" },
    { status: 500 },
  );
}

export async function supabaseAdminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("apikey", supabaseAdminConfig.serviceRoleKey);
  headers.set("Authorization", `Bearer ${supabaseAdminConfig.serviceRoleKey}`);
  headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");

  const response = await fetch(`${supabaseAdminConfig.url.replace(/\/$/, "")}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const details = await response.json().catch(() => response.text());
    const message = typeof details === "object" && details && "message" in details ? String(details.message) : response.statusText;
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7);
  }
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (token) return token;
  return "";
}

export async function getProfileFromBearer(request: Request) {
  const token = getBearerToken(request);
  if (!token || !supabaseAdminConfig.url || !supabaseAdminConfig.anonKey) return null;

  const userResponse = await fetch(`${supabaseAdminConfig.url.replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      apikey: supabaseAdminConfig.anonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!userResponse.ok) return null;
  const user = await userResponse.json();
  const rows = await supabaseAdminRequest<Array<{ id: string; roles?: { code: string; name: string } | null }>>(
    `/rest/v1/profiles?select=id,roles(code,name)&auth_user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
  );
  return rows[0] ?? null;
}
