"use client";

import { useMemo, useState } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-go";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-rust";
import { IconCode } from "@/components/Icons";

const LANGUAGES = [
  "plaintext",
  "javascript",
  "jsx",
  "typescript",
  "python",
  "json",
  "bash",
  "sql",
  "yaml",
  "go",
  "java",
  "c",
  "cpp",
  "rust",
  "markup",
  "css",
];

export default function SnippetEditor({ disabled, onSend }) {
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [name, setName] = useState("");

  const highlighted = useMemo(() => {
    if (!content) return "";
    const grammar = Prism.languages[language] || Prism.languages.plaintext || Prism.languages.markup;
    try {
      return Prism.highlight(content, grammar, language);
    } catch {
      return content;
    }
  }, [content, language]);

  function handleSend() {
    if (!content.trim()) return;
    onSend({ name: name.trim() || `snippet.${language === "plaintext" ? "txt" : language}`, language, content });
    setContent("");
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <IconCode className="text-violet-400" />
        <span>Send a text / code snippet</span>
      </div>

      <div className="mb-2 flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="label (optional), e.g. notes.md"
          aria-label="Snippet label"
          className="min-w-0 flex-1 rounded-xl border border-neutral-700 bg-black px-2.5 py-1.5 text-xs text-white placeholder:text-neutral-600 outline-none transition focus:border-emerald-500"
        />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Snippet language"
          className="rounded-xl border border-neutral-700 bg-black px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-emerald-500"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
        placeholder="Paste or type text/code to share instantly…"
        aria-label="Snippet content"
        className="w-full resize-y rounded-xl border border-neutral-700 bg-black px-3 py-2 font-mono text-xs text-white placeholder:font-sans placeholder:text-neutral-600 outline-none transition focus:border-emerald-500"
      />

      {content && (
        <pre className="mt-2 max-h-40 overflow-auto rounded-xl border border-neutral-800 bg-black/60 p-3 text-xs">
          <code
            className={`language-${language}`}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      )}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          disabled={disabled || !content.trim()}
          onClick={handleSend}
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-violet-600 px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send snippet
        </button>
      </div>
    </div>
  );
}
