import { FaceVerificationClient } from "./face-verification-client"
import { signOut } from "@/auth"
import { keycloakLogoutUrl } from "@/lib/keycloak"

async function signOutAction() {
  "use server"

  await signOut({
    redirectTo: keycloakLogoutUrl(),
  })
}

export default function Page() {
  return <FaceVerificationClient signOutAction={signOutAction} />
}
