import { redirect } from "next/navigation";

// `/` is the canonical patient URL. This route survives only from the
// realtime spike, and redirects so there is exactly one patient form address.
export default function PatientRedirectPage() {
  redirect("/");
}
