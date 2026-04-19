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

  const body = await request.json().catch(() => null);

  if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json(
      {
        ok: false,
        message: "email and password are required",
      },
      { status: 400 },
    );
  }

  const response = await fetch(new URL("/auth/v1/token?grant_type=password", supabaseUrl), {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email: body.email,
      password: body.password,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: data?.msg || data?.message || "Invalid login",
        details: data,
      },
      { status: response.status },
    );
  }

  return NextResponse.json({
    ok: true,
    session: {
      access_token: data?.access_token,
      refresh_token: data?.refresh_token,
      expires_in: data?.expires_in,
      token_type: data?.token_type,
    },
    user: data?.user,
  });
}
