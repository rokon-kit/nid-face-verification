import { FaceVerificationClient } from "./face-verification-client"
import { signOut } from "@/auth"

async function signOutAction() {
  "use server"

  await signOut({
    redirectTo: "/login",
  })
}

export default function Page() {
  return <FaceVerificationClient signOutAction={signOutAction} />
}
