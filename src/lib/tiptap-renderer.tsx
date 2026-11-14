import React from 'react';
import katex from 'katex';
import type { TiptapDocument, TiptapMark, TiptapNode } from '@/types';
import { sanitizeTiptapDocument, sanitizeUrl } from '@/lib/validation';

const ENTITY_MAP: Record<string, string> = {
  '&Sigma;': 'Σ',
  '&sigma;': 'σ',
  '&sum;': '∑',
  '&Delta;': 'Δ',
  '&delta;': 'δ',
  '&Omega;': 'Ω',
  '&omega;': 'ω',
  '&mu;': 'μ',
  '&pi;': 'π',
  '&alpha;': 'α',
  '&beta;': 'β',
  '&gamma;': 'γ',
  '&theta;': 'θ',
  '&lambda;': 'λ',
  '&infin;': '∞',
  '&radic;': '√',
  '&int;': '∫',
  '&approx;': '≈',
  '&ne;': '≠',
  '&le;': '≤',
  '&ge;': '≥',
  '&plusmn;': '±',
  '&times;': '×',
  '&divide;': '÷',
  '&sup2;': '²',
  '&sup3;': '³',
  '&deg;': '°',
  '&micro;': 'µ',
  '&ohm;': 'Ω',
};

function decodeCommonEntities(str: string): string {
  return str.replace(/&(?:[a-zA-Z]+|#\d+|#x[a-fA-F0-9]+);/g, (match) => {
    if (ENTITY_MAP[match]) return ENTITY_MAP[match];
    if (match.startsWith('&#x')) {
      const code = parseInt(match.slice(3, -1), 16);
      return !isNaN(code) ? String.fromCodePoint(code) : match;
    }
    if (match.startsWith('&#')) {
      const code = parseInt(match.slice(2, -1), 10);
      return !isNaN(code) ? String.fromCodePoint(code) : match;
    }
    return match;
  });
}

function renderMathToHtml(formula: string, displayMode: boolean): string {
  try {
    return katex.renderToString(formula.trim(), {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
    });
  } catch {
    return formula;
  }
}

interface MathSegment {
  type: 'text' | 'inlineMath' | 'blockMath';
  content: string;
}

function parseMathSegments(rawText: string): MathSegment[] {
  const decoded = decodeCommonEntities(rawText);
  // Matches:
  // 1. $$ ... $$ (block math)
  // 2. \[ ... \] (LaTeX block math)
  // 3. $ ... $ (inline math, excluding currency digits like $50)
  // 4. \( ... \) (LaTeX inline math)
  const mathRegex =
    /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|(?<!\\)\$(?!\s)(?!\d+(?:\.\d+)?(?:\s|$))(?:\\\$|[^\$])+?(?<!\s)\$(?!\d)|\\\([\s\S]+?\\\))/g;

  const segments: MathSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(decoded)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: decoded.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith('$$') && raw.endsWith('$$')) {
      segments.push({ type: 'blockMath', content: raw.slice(2, -2).trim() });
    } else if (raw.startsWith('\\[') && raw.endsWith('\\]')) {
      segments.push({ type: 'blockMath', content: raw.slice(2, -2).trim() });
    } else if (raw.startsWith('$') && raw.endsWith('$')) {
      segments.push({ type: 'inlineMath', content: raw.slice(1, -1).trim() });
    } else if (raw.startsWith('\\(') && raw.endsWith('\\)')) {
      segments.push({ type: 'inlineMath', content: raw.slice(2, -2).trim() });
    }
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < decoded.length) {
    segments.push({ type: 'text', content: decoded.slice(lastIndex) });
  }

  return segments;
}

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
        const rel = typeof mark.attrs?.rel === 'string' ? mark.attrs.rel : 'noopener noreferrer';
        return (
          <a
            key={key}
            href={href}
            target="_blank"
            rel={rel}
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

function renderTextWithMath(
  text: string,
  marks: TiptapMark[] | undefined,
  keyPrefix: string
): React.ReactNode {
  const segments = parseMathSegments(text);

  if (segments.length === 1 && segments[0].type === 'text') {
    return applyMarks(segments[0].content, marks, keyPrefix);
  }

  return (
    <React.Fragment key={keyPrefix}>
      {segments.map((seg, idx) => {
        const segKey = `${keyPrefix}-seg-${idx}`;
        if (seg.type === 'inlineMath') {
          return (
            <span
              key={segKey}
              className="inline-math inline-block px-1 align-baseline text-[#0B1528]"
              dangerouslySetInnerHTML={{ __html: renderMathToHtml(seg.content, false) }}
            />
          );
        }
        if (seg.type === 'blockMath') {
          return (
            <span
              key={segKey}
              className="block-math block my-4 overflow-x-auto py-2.5 px-4 rounded-xl bg-slate-50/90 border border-slate-200/80 text-center text-[#0B1528] shadow-xs"
              dangerouslySetInnerHTML={{ __html: renderMathToHtml(seg.content, true) }}
            />
          );
        }
        return <React.Fragment key={segKey}>{applyMarks(seg.content, marks, segKey)}</React.Fragment>;
      })}
    </React.Fragment>
  );
}

function renderNode(node: TiptapNode, key: string): React.ReactNode {
  if (node.type === 'text') {
    return <React.Fragment key={key}>{renderTextWithMath(node.text ?? '', node.marks, key)}</React.Fragment>;
  }

  const children = node.content?.map((child, idx) => renderNode(child, `${key}-${idx}`)) ?? null;

  switch (node.type) {
    case 'doc':
      return <React.Fragment key={key}>{children}</React.Fragment>;
    case 'paragraph': {
      // If the paragraph contains exactly one text child that is pure block math ($$...$$)
      if (
        node.content?.length === 1 &&
        node.content[0].type === 'text' &&
        typeof node.content[0].text === 'string'
      ) {
        const raw = node.content[0].text.trim();
        if (
          (raw.startsWith('$$') && raw.endsWith('$$')) ||
          (raw.startsWith('\\[') && raw.endsWith('\\]'))
        ) {
          const formula = raw.startsWith('$$') ? raw.slice(2, -2).trim() : raw.slice(2, -2).trim();
          return (
            <div
              key={key}
              className="my-6 overflow-x-auto rounded-xl bg-slate-50/90 p-4 border border-slate-200/80 text-center text-[#0B1528] shadow-xs"
              dangerouslySetInnerHTML={{ __html: renderMathToHtml(formula, true) }}
            />
          );
        }
      }
      return (
        <p key={key} className="my-5 text-[17px] leading-[1.78] text-slate-800">
          {children && children.length > 0 ? children : <br />}
        </p>
      );
    }
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
      const language = typeof node.attrs?.language === 'string' ? node.attrs.language.toLowerCase() : '';
      const rawText = node.content?.map((c) => c.text ?? '').join('') ?? '';
      if (language === 'math' || language === 'latex' || language === 'katex') {
        return (
          <div
            key={key}
            className="my-6 overflow-x-auto rounded-xl bg-slate-50/90 p-4 border border-slate-200/80 text-center text-[#0B1528] shadow-xs"
            dangerouslySetInnerHTML={{ __html: renderMathToHtml(rawText, true) }}
          />
        );
      }
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
