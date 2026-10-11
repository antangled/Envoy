"use client";
import { useLayoutEffect, useRef } from "react";
import { AI_BLOCKS, VARIABLES, tokenize } from "@/lib/template/render";

/**
 * A plain textarea with a highlight layer behind it: the user edits the whole email as one piece of text,
 * while variables, generated sections, and unfilled placeholders are colored in place.
 */
export function TemplateEditor({ id, value, onChange, minRows = 12, label }: { id: string; value: string; onChange: (v: string) => void; minRows?: number; label: string }) {
  const ta = useRef<HTMLTextAreaElement>(null);

  // Grow with the content so the whole email is always visible without an inner scrollbar.
  useLayoutEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const insert = (token: string, block: boolean) => {
    const el = ta.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const text = block ? `${before.endsWith("\n\n") || !before ? "" : before.endsWith("\n") ? "\n" : "\n\n"}${token}\n\n` : token;
    onChange(before + text + after);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = before.length + text.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-t-lg border border-b-0 border-rule bg-sunken px-2 py-1.5" role="toolbar" aria-label="Insert into email">
        <span className="px-1 text-[12px] text-ink-3">Insert</span>
        {VARIABLES.map((v) => (
          <button key={v.token} type="button" title={v.help} onClick={() => insert(v.token, false)} className="rounded-md bg-ok-bg px-2 py-0.5 text-[12px] font-semibold text-ok hover:brightness-95">
            {v.label}
          </button>
        ))}
        {AI_BLOCKS.map((v) => (
          <button key={v.token} type="button" title={v.help} onClick={() => insert(v.token, v.token === "{{ai_ideas}}")} className="rounded-md bg-carbon px-2 py-0.5 text-[12px] font-semibold text-link hover:brightness-95">
            ✦ {v.label}
          </button>
        ))}
      </div>
      <div className="relative rounded-b-lg border border-rule bg-surface focus-within:outline focus-within:outline-2 focus-within:outline-link">
        <div aria-hidden className="editor-layer pointer-events-none absolute inset-0 overflow-hidden text-ink">
          <Highlighted text={value} />
        </div>
        <label htmlFor={id} className="sr-only">{label}</label>
        <textarea
          id={id}
          ref={ta}
          value={value}
          rows={minRows}
          spellCheck
          onChange={(e) => onChange(e.target.value)}
          className="editor-layer relative block w-full resize-none overflow-hidden bg-transparent text-transparent caret-[var(--ink)] outline-none selection:bg-carbon selection:text-transparent"
        />
      </div>
    </div>
  );
}

function Highlighted({ text }: { text: string }) {
  return (
    <>
      {tokenize(text).map((p, i) => {
        if (p.kind === "text") return <span key={i}>{p.text}</span>;
        if (p.kind === "fill") return <mark key={i} className="rounded-sm bg-warn-bg text-warn">[{p.text}]</mark>;
        if (p.kind === "var") return <mark key={i} className="rounded-sm bg-ok-bg text-ok">{p.raw}</mark>;
        if (p.kind === "ai") return <mark key={i} className="rounded-sm bg-carbon text-link">{p.raw}</mark>;
        return <mark key={i} className="rounded-sm bg-bad-bg text-bad">{p.raw}</mark>;
      })}
      {/* keeps the layer as tall as the textarea when the text ends in a newline */}
      {"\n "}
    </>
  );
}
