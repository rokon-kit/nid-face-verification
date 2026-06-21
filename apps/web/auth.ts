import NextAuth, { type NextAuthResult } from "next-auth"
import Keycloak from "next-auth/providers/keycloak"

const PUBLIC_FILE =
  /\.(?:avif|gif|ico|jpg|jpeg|png|svg|webp|txt|xml|json|webmanifest)$/i

function env(name: string) {
  const value = process.env[name]
  return value && value.length > 0 ? value : undefined
}

const authResult: NextAuthResult = NextAuth({
  secret: env("AUTH_SECRET") ?? env("NEXTAUTH_SECRET"),
  trustHost: true,
  providers: [
    Keycloak({
      name: "Secure Account",
      clientId: env("KEYCLOAK_CLIENT_ID") ?? env("AUTH_KEYCLOAK_ID"),
      clientSecret:
        env("KEYCLOAK_CLIENT_SECRET") ?? env("AUTH_KEYCLOAK_SECRET"),
      issuer: env("KEYCLOAK_ISSUER") ?? env("AUTH_KEYCLOAK_ISSUER"),
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { nextUrl } = request
      const pathname = nextUrl.pathname
      const isLoggedIn = Boolean(auth)
      const isAuthRoute = pathname.startsWith("/api/auth")
      const isLoginRoute = pathname === "/login"
      const isPublicFile = PUBLIC_FILE.test(pathname)

      if (isLoggedIn && isLoginRoute) {
        return Response.redirect(new URL("/", nextUrl.origin))
      }

      if (!isLoggedIn && !isAuthRoute && !isLoginRoute && !isPublicFile) {
        const loginUrl = new URL("/login", nextUrl.origin)
        loginUrl.searchParams.set(
          "callbackUrl",
          `${pathname}${nextUrl.search}`
        )
        return Response.redirect(loginUrl)
      }

      return true
    },
  },
})

export const handlers: NextAuthResult["handlers"] = authResult.handlers
export const signIn: NextAuthResult["signIn"] = authResult.signIn
export const signOut: NextAuthResult["signOut"] = authResult.signOut
export const auth: NextAuthResult["auth"] = authResult.auth
