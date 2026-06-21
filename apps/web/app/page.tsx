import { FaceVerificationClient } from "./face-verification-client"
import { signOut } from "@/auth"

async function signOutAction() {
  "use server"

  await signOut({
    redirectTo: "/api/auth/keycloak-logout",
  })
}

export default function Page() {
  return <FaceVerificationClient signOutAction={signOutAction} />
}
