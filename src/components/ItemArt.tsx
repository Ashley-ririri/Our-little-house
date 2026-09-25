export function ItemArt({ id, className }: { id: string; className?: string }) {
  if (id === 'carpet') {
    return (
      <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
        <ellipse cx="60" cy="64" rx="46" ry="28" fill="#e7b89a" />
        <ellipse cx="60" cy="64" rx="34" ry="18" fill="#d97862" />
        <ellipse cx="60" cy="64" rx="18" ry="9" fill="#f3d2bc" />
      </svg>
    )
  }
  if (id === 'tree') {
    return (
      <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
        <rect x="56" y="28" width="8" height="78" rx="4" fill="#b57a45" />
        <rect x="28" y="78" width="64" height="10" rx="5" fill="#c48955" />
        <rect x="34" y="50" width="52" height="10" rx="5" fill="#c48955" />
        <rect x="40" y="22" width="40" height="26" rx="8" fill="#d97862" />
      </svg>
    )
  }
  if (id === 'record') {
    return (
      <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
        <rect x="18" y="48" width="84" height="46" rx="10" fill="#8d5a3c" />
        <circle cx="52" cy="70" r="20" fill="#1c1c1c" />
        <circle cx="52" cy="70" r="6" fill="#e39b73" />
        <rect x="74" y="58" width="6" height="22" rx="3" fill="#f3e2d2" transform="rotate(18 77 69)" />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <path d="M30 78c0-20 14-34 30-34s30 14 30 34v16H30V78z" fill="#6e9a76" />
      <circle cx="60" cy="46" r="22" fill="#6e9a76" />
      <circle cx="60" cy="50" r="16" fill="#f4e6da" />
      <path d="M40 70l6-16 8 10 8-18 8 18 8-12 8 18" fill="#5e8a68" />
      <ellipse cx="54" cy="50" rx="2" ry="3" fill="#3f322c" />
      <ellipse cx="66" cy="50" rx="2" ry="3" fill="#3f322c" />
    </svg>
  )
}
