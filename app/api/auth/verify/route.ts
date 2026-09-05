import { NextResponse } from "next/server";
import { consumeLoginToken, startSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Target of the emailed magic link: exchanges the token for a session cookie. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const origin = new URL(request.url).origin;

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing", origin));
  }

  const user = await consumeLoginToken(token);
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=expired", origin));
  }

  await startSession(user.id);
  return NextResponse.redirect(new URL(user.role === "ADMIN" ? "/admin" : "/", origin));
}
