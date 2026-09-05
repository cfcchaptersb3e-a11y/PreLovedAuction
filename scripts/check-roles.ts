/**
 * Checks the permission table every guard and every button reads from.
 *
 * Run with:  npm run check:roles
 * Pure functions only — no database needed.
 */
import { ASSIGNABLE_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, can, isStaff } from "@/lib/permissions";
import type { Role } from "@prisma/client";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

// The whole matrix, written out so a change to it has to be deliberate.
const EXPECTED: Record<Role, { events: boolean; items: boolean; payments: boolean; people: boolean }> = {
  BIDDER:     { events: false, items: false, payments: false, people: false },
  CATALOGUER: { events: false, items: true,  payments: false, people: false },
  TREASURER:  { events: false, items: false, payments: true,  people: false },
  ADMIN:      { events: true,  items: true,  payments: true,  people: true },
};

for (const role of ASSIGNABLE_ROLES) {
  for (const [capability, allowed] of Object.entries(EXPECTED[role])) {
    check(
      `${role} ${allowed ? "can" : "cannot"} ${capability}`,
      can(role, capability as keyof (typeof EXPECTED)["ADMIN"]) === allowed
    );
  }
}

check("a bidder is not staff", !isStaff("BIDDER"));
check("a cataloguer is staff", isStaff("CATALOGUER"));
check("a treasurer is staff", isStaff("TREASURER"));
check("an organiser is staff", isStaff("ADMIN"));

check("only organisers can grant roles",
  ASSIGNABLE_ROLES.filter((r) => can(r, "people")).join(",") === "ADMIN");
check("only organisers can open or close an auction",
  ASSIGNABLE_ROLES.filter((r) => can(r, "events")).join(",") === "ADMIN");
check("cataloguers cannot see payments", !can("CATALOGUER", "payments"));
check("treasurers cannot change items", !can("TREASURER", "items"));

check("every role has a label and a description",
  ASSIGNABLE_ROLES.every((r) => ROLE_LABELS[r]?.length > 0 && ROLE_DESCRIPTIONS[r]?.length > 0));
check("roles are offered least-access first",
  ASSIGNABLE_ROLES.map((r) => Object.values(EXPECTED[r]).filter(Boolean).length)
    .every((count, i, all) => i === 0 || all[i - 1] <= count));

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} failed.`);
process.exit(failures ? 1 : 0);
