"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils/cn";

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

export function MarkdownRenderer({ content, isStreaming, className }: MarkdownRendererProps) {
  if (!content) return null;

  return (
    <div className={cn("text-[14px] text-ink leading-[1.65] font-sans", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2.5 last:mb-0 text-[var(--text-secondary)]">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-2 space-y-1 text-[var(--text-secondary)]">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-2 space-y-1 text-[var(--text-secondary)]">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
          h1: ({ children }) => (
            <h1 className="text-[18px] font-semibold text-ink mt-5 mb-2 tracking-tight">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[15px] font-semibold text-ink mt-4 mb-1.5 tracking-tight">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[14px] font-semibold text-ink mt-3 mb-1">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)] mt-3 mb-1">
              {children}
            </h4>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[var(--border-strong)] pl-3 my-2 text-[var(--text-muted)] italic">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName && typeof children === "string" && !children.includes("\n");
            if (isInline) {
              return (
                <code
                  className="px-1 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-surface)] text-[var(--accent-text)] font-mono text-[12px]"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="p-3 my-2.5 rounded-xl bg-[var(--bg-inverse)] overflow-x-auto text-[12px] font-mono text-[#eceaf5]">
                <code className={codeClassName} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-[var(--border-surface)]">
              <table className="min-w-full text-[12px] text-left border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)]">{children}</thead>
          ),
          tbody: ({ children }) => <tbody className="divide-y divide-[var(--border-surface)]">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-[var(--bg-subtle)]/60 transition-colors">{children}</tr>,
          th: ({ children }) => <th className="px-3 py-2 font-medium text-ink">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 text-[var(--text-secondary)]">{children}</td>,
          hr: () => <hr className="border-[var(--border-surface)] my-4" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent-text)] hover:text-[var(--accent-text-strong)] underline underline-offset-2"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>

      {isStreaming && (
        <span className="inline-block w-[2px] h-[14px] ml-0.5 bg-[var(--accent-primary)] animate-pulse align-middle" />
      )}
    </div>
  );
}
