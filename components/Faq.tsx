import type { FaqSection } from "@/lib/faq";

/**
 * Turns **bold** into elements without handing markup to the browser.
 *
 * Nothing else in this app renders raw HTML, and a FAQ is a poor reason to
 * start: the day somebody pastes an answer in from elsewhere, this stays safe.
 */
function renderRich(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index} className="font-semibold text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );
}

/**
 * Native <details>, so every answer opens without JavaScript, is findable with
 * the browser's own search once opened, and needs no client component.
 */
export function Faq({ sections }: { sections: FaqSection[] }) {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-24">
          <h2 className="text-xl font-bold">{section.title}</h2>
          <p className="mt-1 max-w-prose text-sm text-muted">{section.blurb}</p>

          <div className="card mt-4 divide-y divide-line">
            {section.questions.map((question) => (
              <details key={question.id} id={question.id} className="group scroll-mt-24">
                <summary className="flex cursor-pointer list-none items-start gap-3 p-4 font-medium hover:bg-parchment/50">
                  <span
                    aria-hidden
                    className="mt-0.5 shrink-0 text-muted transition group-open:rotate-90"
                  >
                    ›
                  </span>
                  <span>{question.q}</span>
                </summary>
                <div className="space-y-3 px-4 pb-4 pl-10">
                  {question.a.map((paragraph, index) => (
                    <p key={index} className="max-w-prose text-sm leading-relaxed text-muted">
                      {renderRich(paragraph)}
                    </p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Jump links, so a long page is still navigable on a phone. */
export function FaqContents({ sections }: { sections: FaqSection[] }) {
  return (
    <nav aria-label="Sections" className="flex flex-wrap gap-2">
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-muted hover:border-forest/40 hover:text-ink"
        >
          {section.title}
        </a>
      ))}
    </nav>
  );
}
