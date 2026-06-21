import { NextRequest, NextResponse } from "next/server"

function safeCallbackUrl(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/"
  }

  if (value === "/login" || value.startsWith("/login?")) {
    return "/"
  }

  if (value === "/api/auth/signin" || value.startsWith("/api/auth/signin?")) {
    return "/"
  }

  return value
}

export function GET(request: NextRequest) {
  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set(
    "callbackUrl",
    safeCallbackUrl(request.nextUrl.searchParams.get("callbackUrl"))
  )

  return NextResponse.redirect(loginUrl)
}
