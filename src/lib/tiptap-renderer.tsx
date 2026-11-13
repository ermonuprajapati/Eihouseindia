import React from 'react';
import type { TiptapDocument, TiptapMark, TiptapNode } from '@/types';
import { sanitizeTiptapDocument, sanitizeUrl } from '@/lib/validation';

function applyMarks(text: React.ReactNode, marks: TiptapMark[] | undefined, keyPrefix: string): React.ReactNode {
  if (!marks || marks.length === 0) return text;
  return marks.reduce<React.ReactNode>((acc, mark, idx) => {
    const key = `${keyPrefix}-m-${idx}`;
    switch (mark.type) {
      case 'bold':
        return <strong key={key} className="font-semibold text-[#0B1528]">{acc}</strong>;
      case 'italic':
        return <em key={key} className="italic">{acc}</em>;
      case 'underline':
        return <u key={key} className="underline underline-offset-4 decoration-slate-400">{acc}</u>;
      case 'code':
        return (
          <code
            key={key}
            className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.875em] text-[#0B1528] border border-slate-200"
          >
            {acc}
          </code>
        );
      case 'link': {
        const href = typeof mark.attrs?.href === 'string' ? sanitizeUrl(mark.attrs.href) : null;
        if (!href) return acc;
        return (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-[#1D4ED8] underline underline-offset-4 decoration-[#1D4ED8]/40 hover:decoration-[#1D4ED8] transition-colors"
          >
            {acc}
          </a>
        );
      }
      default:
        return acc;
    }
  }, text);
}

function renderNode(node: TiptapNode, key: string): React.ReactNode {
  if (node.type === 'text') {
    return <React.Fragment key={key}>{applyMarks(node.text ?? '', node.marks, key)}</React.Fragment>;
  }

  const children = node.content?.map((child, idx) => renderNode(child, `${key}-${idx}`)) ?? null;

  switch (node.type) {
    case 'doc':
      return <React.Fragment key={key}>{children}</React.Fragment>;
    case 'paragraph':
      return (
        <p key={key} className="my-5 text-[17px] leading-[1.78] text-slate-800">
          {children && children.length > 0 ? children : <br />}
        </p>
      );
    case 'heading': {
      const level = Number(node.attrs?.level) || 2;
      if (level === 1) {
        return (
          <h1 key={key} className="mt-10 mb-4 font-display text-3xl font-semibold tracking-tight text-[#0B1528]">
            {children}
          </h1>
        );
      }
      if (level === 2) {
        return (
          <h2 key={key} className="mt-10 mb-4 font-display text-2xl font-semibold tracking-tight text-[#0B1528]">
            {children}
          </h2>
        );
      }
      if (level === 3) {
        return (
          <h3 key={key} className="mt-8 mb-3 font-sans text-xl font-semibold text-[#0B1528]">
            {children}
          </h3>
        );
      }
      return (
        <h4 key={key} className="mt-6 mb-2 font-sans text-lg font-semibold text-[#0B1528]">
          {children}
        </h4>
      );
    }
    case 'bulletList':
      return (
        <ul key={key} className="my-5 list-disc pl-6 space-y-2 text-[17px] leading-[1.75] text-slate-800">
          {children}
        </ul>
      );
    case 'orderedList':
      return (
        <ol key={key} className="my-5 list-decimal pl-6 space-y-2 text-[17px] leading-[1.75] text-slate-800">
          {children}
        </ol>
      );
    case 'listItem':
      return <li key={key} className="pl-1">{children}</li>;
    case 'blockquote':
      return (
        <blockquote
          key={key}
          className="my-8 border-y border-slate-200 py-5 px-2 font-display text-xl italic leading-relaxed text-[#0B1528]"
        >
          {children}
        </blockquote>
      );
    case 'codeBlock': {
      const language = typeof node.attrs?.language === 'string' ? node.attrs.language : '';
      const rawText = node.content?.map((c) => c.text ?? '').join('') ?? '';
      return (
        <div key={key} className="my-6 overflow-hidden rounded-lg border border-slate-800 bg-[#0B1528]">
          {language ? (
            <div className="border-b border-slate-800 px-4 py-1.5 font-mono text-xs text-slate-400">
              {language}
            </div>
          ) : null}
          <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-slate-100">
            <code>{rawText}</code>
          </pre>
        </div>
      );
    }
    case 'horizontalRule':
      return <hr key={key} className="my-10 border-t border-slate-200" />;
    case 'hardBreak':
      return <br key={key} />;
    case 'image': {
      const src = typeof node.attrs?.src === 'string' ? sanitizeUrl(node.attrs.src) : null;
      if (!src) return null;
      const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : 'Editorial technical illustration';
      const title = typeof node.attrs?.title === 'string' ? node.attrs.title : '';
      return (
        <figure key={key} className="my-8">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              referrerPolicy="no-referrer"
              className="w-full h-auto object-cover"
              loading="lazy"
            />
          </div>
          {(title || alt) && (
            <figcaption className="mt-2 text-center font-sans text-xs text-slate-500">
              {title || alt}
            </figcaption>
          )}
        </figure>
      );
    }
    case 'table':
      return (
        <div key={key} className="my-7 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full border-collapse text-left text-sm text-slate-800">
            <tbody>{children}</tbody>
          </table>
        </div>
      );
    case 'tableRow':
      return <tr key={key} className="border-b border-slate-200 last:border-b-0">{children}</tr>;
    case 'tableHeader':
      return (
        <th
          key={key}
          className="bg-slate-50 px-4 py-2.5 font-semibold text-[#0B1528] border-r border-slate-200 last:border-r-0"
        >
          {children}
        </th>
      );
    case 'tableCell':
      return (
        <td
          key={key}
          className="px-4 py-2.5 align-top border-r border-slate-200 last:border-r-0"
        >
          {children}
        </td>
      );
    default:
      return null;
  }
}

export function TiptapArticleRenderer({ document }: { document: TiptapDocument | unknown }) {
  const sanitized = sanitizeTiptapDocument(document);
  return <div className="editorial-prose">{renderNode(sanitized, 'doc')}</div>;
}
