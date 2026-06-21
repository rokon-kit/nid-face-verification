import { NextRequest, NextResponse } from "next/server"

import { keycloakLogoutUrl } from "@/lib/keycloak"

export function GET(request: NextRequest) {
  return NextResponse.redirect(keycloakLogoutUrl(request.nextUrl.origin))
}
