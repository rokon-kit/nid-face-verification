function env(name: string) {
  const value = process.env[name]
  return value && value.length > 0 ? value : undefined
}

function issuerUrl() {
  const issuer = env("KEYCLOAK_ISSUER") ?? env("AUTH_KEYCLOAK_ISSUER")
  return issuer ? new URL(issuer) : null
}

function appUrl(fallbackOrigin?: string) {
  return env("AUTH_URL") ?? env("NEXTAUTH_URL") ?? fallbackOrigin ?? "/"
}

export function loginUrl(fallbackOrigin?: string) {
  return new URL("/login", appUrl(fallbackOrigin)).toString()
}

export function keycloakLogoutUrl(fallbackOrigin?: string) {
  const issuer = issuerUrl()
  const clientId = env("KEYCLOAK_CLIENT_ID") ?? env("AUTH_KEYCLOAK_ID")

  if (!issuer || !clientId) {
    return loginUrl(fallbackOrigin)
  }

  const logoutUrl = new URL(
    `${issuer.toString().replace(/\/$/, "")}/protocol/openid-connect/logout`
  )
  logoutUrl.searchParams.set("client_id", clientId)
  logoutUrl.searchParams.set(
    "post_logout_redirect_uri",
    loginUrl(fallbackOrigin)
  )

  return logoutUrl.toString()
}

export function isKeycloakRedirectUrl(url: string) {
  const issuer = issuerUrl()

  if (!issuer) {
    return false
  }

  try {
    return new URL(url).origin === issuer.origin
  } catch {
    return false
  }
}
