"use client";

import type { ReactNode } from 'react';

export type BadgeTone = 'default' | 'info' | 'success' | 'warning' | 'danger';

type HeaderTag = {
  label: string;
  tone?: BadgeTone;
};

function toneClass(tone: BadgeTone): string {
  return tone === 'default' ? '' : ` ${tone}`;
}

export function StatusBadge({
  children,
  tone = 'default'
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return <span className={`status-chip${toneClass(tone)}`}>{children}</span>;
}

export function ConsolePageHeader({
  eyebrow,
  title,
  description,
  tags,
  actions
}: {
  eyebrow: string;
  title: string;
  description?: string;
  tags?: HeaderTag[];
  actions?: ReactNode;
}) {
  return (
    <header className="section-head console-header">
      <div className="console-header-meta">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p className="sub">{description}</p> : null}
        {tags?.length ? (
          <div className="console-header-tags">
            {tags.map((tag) => (
              <StatusBadge key={`${tag.label}-${tag.tone || 'default'}`} tone={tag.tone}>
                {tag.label}
              </StatusBadge>
            ))}
          </div>
        ) : null}
      </div>
      {actions ? <div className="console-header-actions">{actions}</div> : null}
    </header>
  );
}

export function ConsolePanel({
  title,
  description,
  actions,
  children,
  className
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card console-panel${className ? ` ${className}` : ''}`}>
      {(title || description || actions) && (
        <div className="console-panel-head">
          <div className="stack-8">
            {title ? <h3>{title}</h3> : null}
            {description ? <p className="muted">{description}</p> : null}
          </div>
          {actions ? <div className="actions" style={{ marginTop: 0 }}>{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

export function ConsoleEmpty({ text }: { text: string }) {
  return <div className="empty-state console-empty">{text}</div>;
}

export function formatMoney(value: number | string | null | undefined) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const t = new Date(value);
  if (Number.isNaN(t.getTime())) return '-';
  const locale =
    typeof document !== 'undefined' && document.documentElement.lang?.toLowerCase().startsWith('en')
      ? 'en-US'
      : 'zh-CN';
  return t.toLocaleString(locale);
}
