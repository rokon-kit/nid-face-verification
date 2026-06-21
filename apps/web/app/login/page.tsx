import type { Metadata } from "next"
import { redirect } from "next/navigation"
import {
  KeyRound,
  LockKeyhole,
  LogIn,
  ScanFace,
  ShieldCheck,
} from "lucide-react"

import { auth, signIn } from "@/auth"
import { Button } from "@workspace/ui/components/button"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Sign in | NID Face Verification",
}

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string | string[]
    error?: string | string[]
  }>
}

function safeRedirectPath(value: unknown) {
  if (typeof value !== "string") {
    return "/"
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/"
  }

  return value
}

async function signInWithKeycloak(formData: FormData) {
  "use server"

  await signIn("keycloak", {
    redirectTo: safeRedirectPath(formData.get("redirectTo")),
  })
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth()

  if (session) {
    redirect("/")
  }

  const params = await searchParams
  const callbackUrl = safeRedirectPath(params.callbackUrl)
  const hasSignInError = Boolean(params.error)

  return (
    <main className="min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(82,194,195,0.22),transparent_32%),linear-gradient(135deg,#f8fbff_0%,#e7fbfb_52%,#f4fffe_100%)] text-[#263b3e] dark:bg-[radial-gradient(circle_at_top_left,rgba(82,194,195,0.18),transparent_34%),linear-gradient(135deg,#061416_0%,#09282b_55%,#041114_100%)] dark:text-white">
      <div className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,430px)] lg:px-8">
        <section className="hidden min-w-0 lg:block">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-[8px] border border-[#52C2C3]/30 bg-white/72 px-3 py-2 text-sm font-semibold text-[#2f9fa0] shadow-sm shadow-[#52C2C3]/12 backdrop-blur dark:border-[#52C2C3]/24 dark:bg-white/8 dark:text-[#bdf5f5]">
              <ShieldCheck className="size-4" />
              Secured access
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-normal text-[#123638] sm:text-5xl dark:text-white">
              NID Face Verification
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-[#657b7b] dark:text-white/64">
              Sign in with your Keycloak account before opening camera capture,
              registration, identification, or verification workflows.
            </p>
          </div>

          <div className="mt-10 max-w-xl rounded-[8px] border border-white/60 bg-white/58 p-4 shadow-2xl shadow-[#6e9692]/18 backdrop-blur dark:border-[#52C2C3]/16 dark:bg-white/6 dark:shadow-black/24">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[8px] bg-[#061416] text-[#dffbf7]">
              <div className="scanner-grid absolute inset-0" />
              <div className="scan-band absolute inset-x-[12%] top-[16%] h-24 rounded-[8px] bg-[linear-gradient(180deg,rgba(94,234,212,0.20),rgba(5,170,153,0.10),transparent)]" />
              <div className="scan-line absolute inset-x-[11%] top-[18%] h-[3px] rounded-full bg-[linear-gradient(90deg,transparent,rgba(5,170,153,0.98),rgba(94,234,212,0.96),rgba(223,251,247,0.82),transparent)] shadow-[0_0_36px_rgba(5,170,153,0.85)]" />
              <div className="absolute top-5 left-5 size-14 border-t-2 border-l-2 border-[#05aa99]/85" />
              <div className="absolute top-5 right-5 size-14 border-t-2 border-r-2 border-[#5eead4]/85" />
              <div className="absolute bottom-5 left-5 size-14 border-b-2 border-l-2 border-[#9ff6eb]/75" />
              <div className="absolute right-5 bottom-5 size-14 border-r-2 border-b-2 border-[#05aa99]/85" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex size-28 items-center justify-center rounded-full border border-[#5eead4]/28 bg-white/8 shadow-[0_0_48px_rgba(82,194,195,0.22)] backdrop-blur">
                  <ScanFace className="size-14" />
                </div>
              </div>
              <div className="absolute top-3 left-3 flex items-center gap-2 rounded-[8px] bg-black/42 px-3 py-2 text-xs font-medium backdrop-blur">
                <span className="size-2 rounded-full bg-[#05aa99]" />
                Authentication required
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-[8px] border border-white/62 bg-white/88 p-4 shadow-2xl shadow-[#6e9692]/20 backdrop-blur sm:p-5 dark:border-[#52C2C3]/16 dark:bg-white/8 dark:shadow-black/30">
          <div className="flex items-start justify-between gap-3 border-b border-[#bde7e8] pb-4 dark:border-[#52C2C3]/14">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#2f9fa0] dark:text-[#bdf5f5]">
                Secure login
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-[#123638] dark:text-white">
                Welcome back
              </h2>
            </div>
            <div className="flex size-12 shrink-0 items-center justify-center rounded-[8px] border border-[#52C2C3]/35 bg-[#e7fbfb] text-[#2f9fa0] dark:border-[#52C2C3]/25 dark:bg-[#082629] dark:text-[#52C2C3]">
              <LockKeyhole className="size-6" />
            </div>
          </div>

          <div className="py-5">
            <div className="flex items-center gap-3 rounded-[8px] border border-[#bde7e8] bg-[#f8fbff] p-3 dark:border-[#52C2C3]/16 dark:bg-black/16">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-white text-[#2f9fa0] shadow-sm dark:bg-white/8 dark:text-[#bdf5f5]">
                <KeyRound className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Keycloak SSO</p>
                <p className="text-sm text-[#657b7b] dark:text-white/58">
                  Continue with your authorized account.
                </p>
              </div>
            </div>

            {hasSignInError ? (
              <div className="mt-4 rounded-[8px] border border-[#ef4444]/22 bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c] dark:border-[#f87171]/22 dark:bg-[#450a0a]/30 dark:text-[#fca5a5]">
                Sign in could not be completed. Please try again.
              </div>
            ) : null}
          </div>

          <form action={signInWithKeycloak}>
            <input name="redirectTo" type="hidden" value={callbackUrl} />
            <Button
              className="h-12 w-full touch-manipulation bg-[#52C2C3] text-white shadow-lg shadow-[#52C2C3]/26 hover:bg-[#49b6b7]"
              type="submit"
            >
              <LogIn className="size-4" />
              Sign in with Keycloak
            </Button>
          </form>
        </section>
      </div>
    </main>
  )
}
