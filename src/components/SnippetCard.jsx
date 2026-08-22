"use client";

import { useMemo, useState } from "react";
import Prism from "prismjs";
import { IconCheck, IconCode, IconCopy } from "@/components/Icons";

export default function SnippetCard({ snippet }) {
  const [copied, setCopied] = useState(false);

  const highlighted = useMemo(() => {
    const grammar = Prism.languages[snippet.language] || Prism.languages.plaintext || Prism.languages.markup;
    try {
      return Prism.highlight(snippet.content, grammar, snippet.language);
    } catch {
      return snippet.content;
    }
  }, [snippet.content, snippet.language]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snippet.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable; ignore silently
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <IconCode className="shrink-0 text-emerald-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{snippet.name}</p>
          <p className="text-xs text-slate-500">
            from {snippet.fromName || "peer"} · {snippet.language}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
        >
          {copied ? <IconCheck className="text-emerald-400" /> : <IconCopy />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-48 overflow-auto rounded-lg border border-slate-800 bg-black/60 p-3 text-xs">
        <code className={`language-${snippet.language}`} dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}
