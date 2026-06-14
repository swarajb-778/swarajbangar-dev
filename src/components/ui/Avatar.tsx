'use client';

// ═══════════════════════════════════════════════════════════════
// Avatar — person/agent mark with initials fallback, optional brand
// gradient ring, and a status dot. Your repo's UI set didn't have this
// yet; it's used by LabDemos (RealtimeDemo) and is handy for chat.
// ═══════════════════════════════════════════════════════════════

import type { HTMLAttributes } from 'react';

const STATUS_COLORS: Record<string, string> = {
  online: 'var(--accent-emerald)',
  busy: 'var(--accent-gold)',
  offline: 'var(--text-disabled)',
};

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  src?: string | null;
  name?: string;
  size?: number;
  ring?: boolean;
  status?: 'online' | 'busy' | 'offline' | string | null;
}

export function Avatar({ src = null, name = '', size = 44, ring = false, status = null, style, ...props }: AvatarProps) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const core = (
    <span
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size, borderRadius: '50%', overflow: 'hidden',
        background: 'var(--bg-elevated)', color: 'var(--accent-primary)',
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size * 0.38,
        userSelect: 'none', flexShrink: 0,
      }}
    >
      {src ? (
        // Plain <img>: avatars are tiny, fixed-size, and often data/blob URLs — next/image adds no value here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : initials || '·'}
    </span>
  );
  return (
    <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, ...style }} {...props}>
      {ring ? (
        <span style={{ display: 'inline-flex', padding: 2, borderRadius: '50%', background: 'var(--gradient-brand, linear-gradient(100deg,#A78BFA,#6C5CE7,#00CEC9))' }}>
          <span style={{ display: 'inline-flex', padding: 2, borderRadius: '50%', background: 'var(--bg-base)' }}>{core}</span>
        </span>
      ) : core}
      {status && (
        <span
          style={{
            position: 'absolute', right: 0, bottom: 0,
            width: Math.max(8, size * 0.22), height: Math.max(8, size * 0.22),
            borderRadius: '50%', background: STATUS_COLORS[status] || status,
            border: '2px solid var(--bg-base)',
            boxShadow: status === 'online' ? '0 0 8px var(--accent-emerald)' : 'none',
          }}
        />
      )}
    </span>
  );
}
