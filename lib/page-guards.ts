import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can, staffLandingPath, type Capability } from "@/lib/permissions";
import type { User } from "@prisma/client";

/**
 * Page-level guard. Sends someone signed out to sign in, and someone whose
 * role can't open this page to one it can, rather than showing an error.
 *
 * Kept apart from lib/auth so that module stays free of Next's navigation
 * runtime and can be exercised directly by the checks in scripts/.
 */
export async function requirePageCapability(capability: Capability): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user.role, capability)) redirect(staffLandingPath(user.role));
  return user;
}
