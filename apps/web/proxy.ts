export { auth as proxy } from "@/auth"

export const config = {
  matcher: [
    "/((?!login|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/.*).*)",
  ],
}
