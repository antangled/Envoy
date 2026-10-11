import { notFound } from "next/navigation";
import { demoCompany } from "@/lib/demo/fixtures";

/** A sample company's web page, so citations in the demo open a real page with the quoted passage highlighted. */
export default async function DemoSource({ params }: { params: Promise<{ domain: string; slug: string }> }) {
  const { domain, slug } = await params;
  const company = demoCompany(domain);
  const page = company?.pages.find((p) => p.slug === slug);
  if (!company || !page) notFound();

  // Highlight any sentence the brief quoted from this page.
  const quotes = company.brief.hook.quotes.filter((q) => page.text.includes(q));
  const parts: { text: string; hit: boolean }[] = [];
  let rest = page.text;
  for (const q of quotes) {
    const i = rest.indexOf(q);
    if (i < 0) continue;
    parts.push({ text: rest.slice(0, i), hit: false }, { text: q, hit: true });
    rest = rest.slice(i + q.length);
  }
  parts.push({ text: rest, hit: false });

  return (
    <div className="min-h-dvh bg-surface">
      <div className="border-b border-rule bg-sunken px-5 py-2 text-center text-[13px] text-ink-2">
        Sample source page for the Envoy demo. {company.name} is a fictional company.
      </div>
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-[760px] items-center justify-between px-5 py-4">
          <span className="text-[17px] font-semibold tracking-[-0.01em]">{company.name}</span>
          <span className="text-[13px] text-ink-3">{domain}/{slug === "home" ? "" : slug}</span>
        </div>
      </header>
      <main className="mx-auto max-w-[760px] px-5 py-14">
        {page.date && <p className="text-[14px] text-ink-3">{page.date}</p>}
        <h1 className="mt-2 text-balance font-serif text-[36px] font-medium leading-[1.12] tracking-[-0.015em]">{page.title}</h1>
        <p className="mt-6 max-w-[65ch] text-pretty text-[17px] leading-[1.75] text-ink">
          {parts.map((p, i) =>
            p.hit ? (
              <mark key={i} className="rounded-sm bg-carbon px-0.5 text-ink shadow-[inset_0_-2px_0_var(--carbon-line)]">
                {p.text}
              </mark>
            ) : (
              <span key={i}>{p.text}</span>
            ),
          )}
        </p>
        {quotes.length > 0 && <p className="mt-8 text-[13px] text-ink-3">Highlighted: the passage Envoy quoted in its draft.</p>}
      </main>
    </div>
  );
}
