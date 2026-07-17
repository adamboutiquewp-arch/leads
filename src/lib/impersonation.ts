import "server-only";
import { cookies } from "next/headers";

export const IMPERSONATION_COOKIE = "leads_impersonation_admin_refresh";

export async function getImpersonationState() {
  const cookieStore = await cookies();
  const adminRefreshToken = cookieStore.get(IMPERSONATION_COOKIE)?.value;
  return { isImpersonating: Boolean(adminRefreshToken), adminRefreshToken };
}
