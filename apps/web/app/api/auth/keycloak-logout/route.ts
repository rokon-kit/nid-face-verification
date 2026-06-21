import { NextRequest, NextResponse } from "next/server"

function env(name: string) {
  const value = process.env[name]
  return value && value.length > 0 ? value : undefined
}

export function GET(request: NextRequest) {
  const issuer = env("KEYCLOAK_ISSUER") ?? env("AUTH_KEYCLOAK_ISSUER")
  const clientId = env("KEYCLOAK_CLIENT_ID") ?? env("AUTH_KEYCLOAK_ID")
  const appUrl = env("AUTH_URL") ?? env("NEXTAUTH_URL") ?? request.nextUrl.origin
  const loginUrl = new URL("/login", appUrl)

  if (!issuer || !clientId) {
    return NextResponse.redirect(loginUrl)
  }

  const logoutUrl = new URL(
    `${issuer.replace(/\/$/, "")}/protocol/openid-connect/logout`
  )
  logoutUrl.searchParams.set("client_id", clientId)
  logoutUrl.searchParams.set("post_logout_redirect_uri", loginUrl.toString())

  return NextResponse.redirect(logoutUrl)
}
