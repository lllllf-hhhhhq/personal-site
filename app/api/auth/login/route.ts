import { NextResponse } from "next/server";
import {
  checkPassword,
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/auth";

export async function POST(request: Request) {
  let password: unknown = "";

  try {
    const body = (await request.json()) as { password?: unknown } | null;
    password = body?.password ?? "";
  } catch {
    password = "";
  }

  if (!checkPassword(password)) {
    return NextResponse.json(
      { ok: false, error: "口令不正确。若线上环境报此错，请确认已配置 ADMIN_PASSWORD。" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
