import { NextResponse } from "next/server";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      {
        ok: false,
        message: "SUPABASE_URL and SUPABASE_ANON_KEY must be set",
      },
      { status: 500 },
    );
  }

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";

  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        message: "Missing bearer token",
      },
      { status: 401 },
    );
  }

  const response = await fetch(new URL("/auth/v1/logout", supabaseUrl), {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    return NextResponse.json(
      {
        ok: false,
        message: data?.msg || data?.message || "Logout failed",
        details: data,
      },
      { status: response.status },
    );
  }

  return NextResponse.json({ ok: true, message: "Logged out" });
}
