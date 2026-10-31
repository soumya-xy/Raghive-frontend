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
    <div className={cn("text-sm text-ink leading-relaxed font-sans space-y-2", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed text-ink/95">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
          em: ({ children }) => <em className="italic text-ink/90">{children}</em>,
          ul: ({ children }) => <ul className="list-disc pl-5 my-2.5 space-y-1 text-ink/95">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-2.5 space-y-1 text-ink/95">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
          h1: ({ children }) => <h1 className="text-lg font-bold text-ink mt-4 mb-2 tracking-tight">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold text-ink mt-3.5 mb-1.5 tracking-tight border-b border-surface/50 pb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold text-ink mt-3 mb-1">{children}</h3>,
          h4: ({ children }) => <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mt-2.5 mb-1">{children}</h4>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-amber-500/50 pl-3 my-2 italic text-muted">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName && typeof children === "string" && !children.includes("\n");
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-surface border border-surface text-amber-500 dark:text-amber-400 font-mono text-xs"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="p-3 my-2.5 rounded-xl bg-surface border border-surface overflow-x-auto text-xs font-mono text-ink">
                <code className={codeClassName} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 border border-surface rounded-xl">
              <table className="min-w-full divide-y divide-surface text-xs text-left">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-surface/80 text-muted uppercase tracking-wider">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-surface/60">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-surface/30 transition-colors">{children}</tr>,
          th: ({ children }) => <th className="px-3 py-2 font-semibold text-ink">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 text-ink/90">{children}</td>,
          hr: () => <hr className="border-surface my-3" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-500 hover:text-amber-600 underline underline-offset-2"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>

      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-1 bg-amber-500 animate-pulse align-middle" />
      )}
    </div>
  );
}

