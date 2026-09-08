/**
 * Checks the two question pages.
 *
 * A FAQ that is subtly wrong is worse than none: it teaches people to distrust
 * the rest of it. These are the things that can be checked mechanically —
 * that every answer exists, that anchors are unique and stable, that the
 * helper page covers every role that can reach it, and that nothing in the
 * public page tells a member to do something only a helper can.
 *
 *   npm run check:faq
 */
import { MEMBER_FAQ, HELPER_FAQ, type FaqSection } from "@/lib/faq";
import { ASSIGNABLE_ROLES, isStaff } from "@/lib/permissions";

let failures = 0;
const check = (n: string, ok: boolean, d = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
  if (!ok) failures++;
};

const every = (sections: FaqSection[]) => sections.flatMap((s) => s.questions);

function checkShape(label: string, sections: FaqSection[]) {
  const questions = every(sections);

  check(`${label}: every question has an answer`,
    questions.every((q) => q.a.length > 0 && q.a.every((line) => line.trim().length > 0)));

  check(`${label}: every question reads as one`,
    questions.every((q) => q.q.trim().endsWith("?") || q.q.trim().endsWith(".")),
    questions.filter((q) => !/[?.]$/.test(q.q.trim())).map((q) => q.q).join("; "));

  const ids = [...sections.map((s) => s.id), ...questions.map((q) => q.id)];
  check(`${label}: anchors are unique`, new Set(ids).size === ids.length,
    ids.filter((id, i) => ids.indexOf(id) !== i).join(", "));

  check(`${label}: anchors are link-safe`, ids.every((id) => /^[a-z0-9-]+$/.test(id)),
    ids.filter((id) => !/^[a-z0-9-]+$/.test(id)).join(", "));

  // ** ** is the only markup the renderer understands; an odd count means a
  // stray pair that would show up as literal asterisks on the page.
  check(`${label}: bold markers are balanced`,
    questions.every((q) => q.a.every((line) => (line.match(/\*\*/g) ?? []).length % 2 === 0)));

  check(`${label}: no raw HTML in answers`,
    questions.every((q) => q.a.every((line) => !/<[a-z/]/i.test(line))));
}

async function main() {
  checkShape("members", MEMBER_FAQ);
  checkShape("helpers", HELPER_FAQ);

  check("the two pages do not share anchors",
    new Set(every(MEMBER_FAQ).map((q) => q.id))
      .isDisjointFrom?.(new Set(every(HELPER_FAQ).map((q) => q.id))) ??
      every(MEMBER_FAQ).every((m) => !every(HELPER_FAQ).some((h) => h.id === m.id)));

  // Every role that can open the helper page should find itself on it.
  const staffRoles = ASSIGNABLE_ROLES.filter((role) => isStaff(role));
  const sections = HELPER_FAQ.map((s) => s.id);
  check("a section for every helper role",
    staffRoles.length === sections.length,
    `${staffRoles.length} roles, ${sections.length} sections`);
  for (const id of ["cataloger", "treasurer", "organizer"]) {
    check(`  covers the ${id}`, sections.includes(id));
  }

  // Everything a reader sees on the page, section headings and blurbs included
  // — reading only the answers missed text that is right there above them.
  const textOf = (sections: FaqSection[]) =>
    sections
      .flatMap((s) => [s.title, s.blurb, ...s.questions.flatMap((q) => [q.q, ...q.a])])
      .join(" ")
      .toLowerCase();

  // The public page is read by people who cannot reach the organizer tools.
  const memberText = textOf(MEMBER_FAQ);
  for (const phrase of ["organizer tools", "manage items", "winners & payments", "download csv"]) {
    check(`the public page does not send members to "${phrase}"`, !memberText.includes(phrase));
  }

  // Both pages should say the things people actually get wrong.
  for (const [what, needle] of [
    ["the two-minute extension", "two minutes"],
    ["that a bid cannot be undone", "cannot be taken back"],
    ["what a reserve is", "reserve"],
    ["that a number-only account gets no alerts", "nothing will chase you"],
  ] as const) {
    check(`the public page explains ${what}`, memberText.includes(needle));
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} failed.`);
  process.exit(failures ? 1 : 0);
}

main();
