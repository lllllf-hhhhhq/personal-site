import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { content, validateSiteContent } from "@/lib/content";
import { saveSiteContent } from "@/lib/repo";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, content });
}

export async function PUT(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const raw =
    (payload as { content?: unknown } | null)?.content ?? payload;

  const parsed = validateSiteContent(raw);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  try {
    const result = await saveSiteContent(parsed.value);
    return NextResponse.json({ ok: true, result, content: parsed.value });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
