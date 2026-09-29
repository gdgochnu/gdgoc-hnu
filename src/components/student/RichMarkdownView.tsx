'use client';

import React from 'react';
import {
  CheckCircle2,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  Award,
  Wrench,
  HelpCircle,
  Clock,
  ArrowRight,
  Code2,
} from 'lucide-react';

interface RichMarkdownViewProps {
  content: string;
  className?: string;
}

// Helper to format inline markdown (bold, italic, code, link)
function renderInlineMarkdown(text: string): React.ReactNode[] {
  // Regex matches:
  // 1. `code`
  // 2. **bold** or __bold__
  // 3. *italic* or _italic_
  // 4. [link](url)
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*]+\*(?!\*)|(?<!_)_[^_]+_(?!_)|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline code
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          style={{
            background: 'rgba(66, 133, 244, 0.15)',
            color: '#93C5FD',
            padding: '0.15rem 0.4rem',
            borderRadius: '6px',
            fontSize: '0.88em',
            fontFamily: 'ui-monospace, monospace',
            border: '1px solid rgba(66, 133, 244, 0.3)',
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold
    if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
    ) {
      return (
        <strong key={index} style={{ color: '#FFFFFF', fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      return (
        <em key={index} style={{ color: '#CBD5E1', fontStyle: 'italic' }}>
          {part.slice(1, -1)}
        </em>
      );
    }

    // Link [label](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#60A5FA',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          {linkMatch[1]}
        </a>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

// Icon helper for special metadata fields
function getFieldIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes('prerequisite') || l.includes('requirements') || l.includes('متطلبات')) {
    return <Layers size={16} style={{ color: '#FBBF24' }} />;
  }
  if (l.includes('tool') || l.includes('stack') || l.includes('technolog') || l.includes('أدوات')) {
    return <Wrench size={16} style={{ color: '#60A5FA' }} />;
  }
  if (l.includes('leave with') || l.includes('outcome') || l.includes('target') || l.includes('certificate') || l.includes('ستتعلم')) {
    return <Award size={16} style={{ color: '#34D399' }} />;
  }
  if (l.includes('learn') || l.includes('what you') || l.includes('topics')) {
    return <Sparkles size={16} style={{ color: '#38BDF8' }} />;
  }
  return <Sparkles size={16} style={{ color: '#60A5FA' }} />;
}

export function RichMarkdownView({ content, className }: RichMarkdownViewProps) {
  if (!content || !content.trim()) {
    return null;
  }

  // Normalize line breaks
  const rawLines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  // Parse structured blocks: Headings, Key-Value badges, Bullet lists, Numbered lists, Week outline cards, paragraphs
  type Block =
    | { type: 'h1' | 'h2' | 'h3' | 'h4'; text: string }
    | { type: 'week_header'; title: string }
    | { type: 'key_value'; label: string; value: string }
    | { type: 'list'; items: string[]; ordered?: boolean }
    | { type: 'code_block'; code: string; lang?: string }
    | { type: 'quote'; text: string }
    | { type: 'divider' }
    | { type: 'paragraph'; text: string };

  const blocks: Block[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    // Code block ```
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
        codeLines.push(rawLines[i]);
        i++;
      }
      i++; // Skip closing ```
      blocks.push({ type: 'code_block', code: codeLines.join('\n'), lang });
      continue;
    }

    // Dividers --- or ***
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(line)) {
      blocks.push({ type: 'divider' });
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      blocks.push({ type: 'h1', text: line.replace(/^#\s+/, '') });
      i++;
      continue;
    }
    if (line.startsWith('## ') && !line.startsWith('### ')) {
      blocks.push({ type: 'h2', text: line.replace(/^##\s+/, '') });
      i++;
      continue;
    }
    if (line.startsWith('### ') && !line.startsWith('#### ')) {
      blocks.push({ type: 'h3', text: line.replace(/^###\s+/, '') });
      i++;
      continue;
    }
    if (line.startsWith('#### ')) {
      blocks.push({ type: 'h4', text: line.replace(/^####\s+/, '') });
      i++;
      continue;
    }

    // Week / Module header, e.g., "**Week 1 — Understanding Code**" or "**Session 1: ...**"
    const weekMatch = line.match(/^\*\*(Week\s+\d+|Session\s+\d+|Module\s+\d+|الأسبوع\s+\d+|المحاضرة\s+\d+[^:*]*)\s*[:—–-]\s*([^*]+)\*\*$/i) ||
                      line.match(/^\*\*(Week\s+\d+|Session\s+\d+|Module\s+\d+|الأسبوع\s+\d+)\*\*$/i);
    if (weekMatch) {
      const title = line.replace(/^\*\*/, '').replace(/\*\*$/, '');
      blocks.push({ type: 'week_header', title });
      i++;
      continue;
    }

    // Key-Value badge like "**Prerequisites:** None" or "**Tools:** Pseudocode..." or "**You'll leave with:** ..."
    const kvMatch = line.match(/^\*\*([^*:]+):\*\*\s*(.+)$/i);
    if (kvMatch) {
      blocks.push({ type: 'key_value', label: kvMatch[1].trim(), value: kvMatch[2].trim() });
      i++;
      continue;
    }

    // Standalone bold subtitle like "**What you'll learn**" or "**Course Requirements**"
    const boldSubMatch = line.match(/^\*\*([^*]+)\*\*$/);
    if (boldSubMatch) {
      blocks.push({ type: 'h4', text: boldSubMatch[1].trim() });
      i++;
      continue;
    }

    // Bullet List (- item, * item)
    if (/^[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < rawLines.length && /^[-*•]\s+/.test(rawLines[i].trim())) {
        items.push(rawLines[i].trim().replace(/^[-*•]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', items, ordered: false });
      continue;
    }

    // Numbered List (1. item)
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < rawLines.length && /^\d+\.\s+/.test(rawLines[i].trim())) {
        items.push(rawLines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', items, ordered: true });
      continue;
    }

    // Quote (> quote)
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('>')) {
        quoteLines.push(rawLines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      blocks.push({ type: 'quote', text: quoteLines.join(' ') });
      continue;
    }

    // Regular Paragraph
    blocks.push({ type: 'paragraph', text: line });
    i++;
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        color: '#CBD5E1',
        fontSize: '0.94rem',
        lineHeight: 1.7,
      }}
    >
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'h1':
            return (
              <h1
                key={idx}
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  margin: '0.75rem 0 0.25rem 0',
                  paddingBottom: '0.5rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  letterSpacing: '-0.3px',
                }}
              >
                {block.text}
              </h1>
            );

          case 'h2':
            return (
              <div
                key={idx}
                style={{
                  marginTop: idx === 0 ? 0 : '1rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '1px solid rgba(66, 133, 244, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                }}
              >
                <div
                  style={{
                    width: '4px',
                    height: '18px',
                    borderRadius: '4px',
                    background: 'linear-gradient(180deg, #4285F4 0%, #34A853 100%)',
                  }}
                />
                <h2
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color: '#F8FAFC',
                    margin: 0,
                    letterSpacing: '-0.2px',
                  }}
                >
                  {block.text}
                </h2>
              </div>
            );

          case 'h3':
          case 'h4':
            return (
              <div
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                  color: '#93C5FD',
                  fontWeight: 700,
                  fontSize: '0.98rem',
                }}
              >
                {getFieldIcon(block.text)}
                <span>{block.text}</span>
              </div>
            );

          case 'week_header':
            return (
              <div
                key={idx}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.15) 0%, rgba(30, 41, 59, 0.5) 100%)',
                  border: '1px solid rgba(66, 133, 244, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                }}
              >
                <Calendar size={16} style={{ color: '#60A5FA', flexShrink: 0 }} />
                <span>{block.title}</span>
              </div>
            );

          case 'key_value':
            return (
              <div
                key={idx}
                style={{
                  padding: '0.85rem 1.1rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                  {getFieldIcon(block.label)}
                  <span style={{ color: '#93C5FD', fontWeight: 700, fontSize: '0.9rem' }}>
                    {block.label}:
                  </span>
                </div>
                <div style={{ color: '#E2E8F0', fontSize: '0.92rem', flex: 1, minWidth: '180px' }}>
                  {renderInlineMarkdown(block.value)}
                </div>
              </div>
            );

          case 'list':
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem',
                  paddingLeft: '0.25rem',
                }}
              >
                {block.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.65rem',
                      fontSize: '0.92rem',
                    }}
                  >
                    {block.ordered ? (
                      <span
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '6px',
                          background: 'rgba(66, 133, 244, 0.2)',
                          color: '#60A5FA',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        {itemIdx + 1}
                      </span>
                    ) : (
                      <span
                        style={{
                          color: '#34A853',
                          display: 'flex',
                          alignItems: 'center',
                          flexShrink: 0,
                          marginTop: '4px',
                        }}
                      >
                        <CheckCircle2 size={14} />
                      </span>
                    )}
                    <span style={{ color: '#CBD5E1', lineHeight: 1.6 }}>
                      {renderInlineMarkdown(item)}
                    </span>
                  </div>
                ))}
              </div>
            );

          case 'code_block':
            return (
              <pre
                key={idx}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'rgba(10, 15, 29, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#93C5FD',
                  fontSize: '0.85rem',
                  fontFamily: 'ui-monospace, monospace',
                  overflowX: 'auto',
                  margin: '0.5rem 0',
                }}
              >
                <code>{block.code}</code>
              </pre>
            );

          case 'quote':
            return (
              <blockquote
                key={idx}
                style={{
                  borderLeft: '3px solid #4285F4',
                  margin: '0.5rem 0',
                  padding: '0.75rem 1rem',
                  background: 'rgba(66, 133, 244, 0.06)',
                  borderRadius: '0 8px 8px 0',
                  color: '#E2E8F0',
                  fontStyle: 'italic',
                }}
              >
                {renderInlineMarkdown(block.text)}
              </blockquote>
            );

          case 'divider':
            return (
              <hr
                key={idx}
                style={{
                  border: 'none',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  margin: '1rem 0',
                }}
              />
            );

          case 'paragraph':
          default:
            return (
              <p
                key={idx}
                style={{
                  margin: 0,
                  color: '#CBD5E1',
                  fontSize: '0.94rem',
                  lineHeight: 1.7,
                }}
              >
                {renderInlineMarkdown(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
}
