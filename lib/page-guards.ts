import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can, isStaff, staffLandingPath, type Capability } from "@/lib/permissions";
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

/**
 * For a page any helper may open, whatever their particular role. The
 * organizer layout guards this too; having it on the page as well means the
 * page cannot be moved out from under that layout and quietly become public.
 */
export async function requireStaffPage(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isStaff(user.role)) redirect("/");
  return user;
}
