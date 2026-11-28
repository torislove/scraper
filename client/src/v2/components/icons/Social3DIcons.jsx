import React from 'react';

const PLATFORM_META = {
  whatsapp: {
    label: 'WhatsApp',
    short: 'WA',
    g1: '#4ade80',
    g2: '#16a34a',
    g3: '#15803d',
    glow: 'rgba(22, 163, 74, 0.35)',
    field: 'whatsappLink',
    path: (
      <path
        d="M12 4.5a7.3 7.3 0 0 0-6.25 11.08L4.9 19.1l3.64-.83A7.3 7.3 0 1 0 12 4.5Zm3.82 10.22c-.17.46-.95.88-1.32.94-.34.05-.77.08-1.24-.08-.3-.1-.68-.24-1.16-.45-2.04-.88-3.36-2.96-3.46-3.1-.1-.14-.82-1.1-.82-2.1 0-.99.51-1.48.7-1.69.18-.2.4-.26.54-.26h.39c.12 0 .3-.05.47.36.17.42.59 1.44.64 1.54.05.1.08.22.02.35-.07.14-.1.22-.2.34-.1.12-.22.27-.31.36-.1.1-.21.22-.09.42.12.2.53.88 1.15 1.43.8.71 1.46.94 1.67 1.04.2.1.32.08.44-.05.12-.14.51-.6.65-.8.14-.2.28-.17.46-.1.18.06 1.19.56 1.4.66.2.1.34.15.39.24.05.09.05.51-.12.97Z"
        fill="#fff"
      />
    )
  },
  instagram: {
    label: 'Instagram',
    short: 'IG',
    g1: '#fb7185',
    g2: '#e1306c',
    g3: '#833ab4',
    glow: 'rgba(225, 48, 108, 0.34)',
    field: 'instagram',
    followersField: 'instagramFollowers',
    path: (
      <>
        <rect x="6.2" y="6.2" width="11.6" height="11.6" rx="3.4" stroke="#fff" strokeWidth="1.9" fill="none" />
        <circle cx="12" cy="12" r="2.75" stroke="#fff" strokeWidth="1.85" fill="none" />
        <circle cx="15.75" cy="8.25" r="0.95" fill="#fff" />
      </>
    )
  },
  facebook: {
    label: 'Facebook',
    short: 'FB',
    g1: '#60a5fa',
    g2: '#1877f2',
    g3: '#1d4ed8',
    glow: 'rgba(24, 119, 242, 0.34)',
    field: 'facebook',
    followersField: 'facebookFollowers',
    path: (
      <path
        d="M13.6 18.8v-6.1h2.05l.31-2.38H13.6V8.8c0-.69.19-1.16 1.18-1.16h1.26V5.51c-.22-.03-.97-.1-1.84-.1-1.82 0-3.07 1.11-3.07 3.16v1.76H9.07v2.38h2.06v6.09h2.47Z"
        fill="#fff"
      />
    )
  },
  linkedin: {
    label: 'LinkedIn',
    short: 'IN',
    g1: '#38bdf8',
    g2: '#0a66c2',
    g3: '#075985',
    glow: 'rgba(10, 102, 194, 0.34)',
    field: 'linkedin',
    followersField: 'linkedinFollowers',
    path: (
      <path
        d="M8.1 17.5H6V10.4h2.1v7.1Zm-1.05-8a1.22 1.22 0 1 1 0-2.44 1.22 1.22 0 0 1 0 2.44ZM18 17.5h-2.1v-3.55c0-.85-.02-1.94-1.18-1.94-1.18 0-1.36.92-1.36 1.87v3.62h-2.1V10.4h2.01v.97h.03c.28-.53.97-1.09 1.99-1.09 2.13 0 2.71 1.4 2.71 3.22v4Z"
        fill="#fff"
      />
    )
  },
  tiktok: {
    label: 'TikTok',
    short: 'TT',
    g1: '#22d3ee',
    g2: '#0f172a',
    g3: '#f43f5e',
    glow: 'rgba(34, 211, 238, 0.32)',
    field: 'tiktok',
    followersField: 'tiktokFollowers',
    path: (
      <path
        d="M15.8 7.8a3.4 3.4 0 0 1-1.95-2.3h-1.8v8.42a1.75 1.75 0 1 1-1.2-1.66v-1.85a3.58 3.58 0 1 0 3 3.53V9.65a5.1 5.1 0 0 0 3 .97V8.8c-.39 0-.74-.34-1.05-1Z"
        fill="#fff"
      />
    )
  },
  twitter: {
    label: 'X / Twitter',
    short: 'X',
    g1: '#475569',
    g2: '#0f172a',
    g3: '#020617',
    glow: 'rgba(15, 23, 42, 0.3)',
    field: 'twitter',
    path: (
      <path
        d="m6.8 6.5 3.92 5.33L6.6 17.5h1.52l3.36-4.35 3.2 4.35h2.7l-4.1-5.58 3.9-5.42h-1.52l-3.15 4.08-3-4.08H6.8Z"
        fill="#fff"
      />
    )
  },
  youtube: {
    label: 'YouTube',
    short: 'YT',
    g1: '#f87171',
    g2: '#ef4444',
    g3: '#b91c1c',
    glow: 'rgba(239, 68, 68, 0.34)',
    field: 'youtube',
    followersField: 'youtubeSubscribers',
    path: (
      <path
        d="M17.7 9.1c-.14-.55-.58-.99-1.12-1.13C15.58 7.7 12 7.7 12 7.7s-3.58 0-4.58.27a1.55 1.55 0 0 0-1.12 1.13C6.03 10.12 6 12 6 12s.03 1.88.3 2.9c.14.55.58.99 1.12 1.13 1 .27 4.58.27 4.58.27s3.58 0 4.58-.27c.54-.14.98-.58 1.12-1.13.27-1.02.3-2.9.3-2.9s-.03-1.88-.3-2.9Zm-7.05 4.78V10.1l3.2 1.89-3.2 1.89Z"
        fill="#fff"
      />
    )
  }
};

const SOCIAL_PLATFORM_KEYS = ['instagram', 'facebook', 'linkedin', 'tiktok', 'twitter', 'youtube'];

export function Social3DIcon({ platform, size = 24, animated = false, delayMs = 0 }) {
  const cfg = PLATFORM_META[platform] || PLATFORM_META.instagram;
  const gradId = `lx3d-${platform}-${size}`;
  return (
    <span
      className={animated ? 'lx-3d-social-float' : 'lx-3d-social-badge'}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        filter: `drop-shadow(0 3px 6px ${cfg.glow})`,
        animationDelay: animated ? `${delayMs}ms` : undefined
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={cfg.g1} />
            <stop offset="55%" stopColor={cfg.g2} />
            <stop offset="100%" stopColor={cfg.g3} />
          </linearGradient>
          <linearGradient id={`${gradId}-shine`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.68)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <rect x="1.5" y="2.2" width="21" height="20.4" rx="6.6" fill="rgba(15,23,42,0.22)" />
        <rect x="1.5" y="1" width="21" height="20.4" rx="6.6" fill={`url(#${gradId})`} />
        <rect x="2.6" y="1.7" width="18.8" height="8.2" rx="5.4" fill={`url(#${gradId}-shine)`} />
        {cfg.path}
      </svg>
    </span>
  );
}

export function SocialHunterBadgeRow({ scanning = false, mobileCount = 0, landlineCount = 0, socialCount = 0, huntingCount = 0 }) {
  const activePlatforms = ['instagram', 'facebook', 'linkedin', 'whatsapp'];
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1 mb-2 bg-slate-50/90 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 flex-shrink-0 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{Number(mobileCount).toLocaleString()} Mobiles</span>
        </span>
        {landlineCount > 0 && (
          <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-lg">
            <span>{Number(landlineCount).toLocaleString()} Landlines</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-sky-700 bg-sky-50 border border-sky-200/80 px-2 py-0.5 rounded-lg">
          <span>{Number(socialCount).toLocaleString()} Socials</span>
        </span>
        {huntingCount > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            <span>Hunting {huntingCount} live…</span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 ml-auto">
        {activePlatforms.map((key, idx) => (
          <Social3DIcon key={key} platform={key} size={17} animated={scanning} delayMs={idx * 120} />
        ))}
      </div>
    </div>
  );
}

export function VendorSocialPills({ vendor, max = 4 }) {
  if (!vendor) return null;
  const items = [];
  for (const key of SOCIAL_PLATFORM_KEYS) {
    const cfg = PLATFORM_META[key];
    const url = vendor[cfg.field];
    if (!url || typeof url !== 'string') continue;
    const followers = cfg.followersField ? vendor[cfg.followersField] : '';
    items.push({ key, url, cfg, followers });
    if (items.length >= max) break;
  }
  if (!items.length) return null;
  return (
    <>
      {items.map(({ key, url, cfg, followers }) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="lx-social-pill-3d"
          title={`${cfg.label}${followers ? ` · ${followers}` : ''}`}
          onClick={e => e.stopPropagation()}
        >
          <Social3DIcon platform={key} size={17} />
          <span>{followers || cfg.short}</span>
        </a>
      ))}
    </>
  );
}

export function SocialPill3D({ platform, url, stat }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="lx-social-pill-3d"
      title={platform}
      onClick={e => e.stopPropagation()}
    >
      <Social3DIcon platform={platform} size={17} />
      <span className="capitalize">{stat || platform}</span>
    </a>
  );
}
