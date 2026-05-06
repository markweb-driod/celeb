import Link from 'next/link'

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showText?: boolean
  /** Pass false to render without a wrapping Link (use when you wrap in your own Link) */
  href?: string | false
  className?: string
  textClass?: string
}

const sizeMap = {
  xs: { badge: 'h-7 w-7 rounded-lg',   text: 'text-sm',      gap: 'gap-1.5' },
  sm: { badge: 'h-7 w-7 rounded-xl',   text: 'text-sm',      gap: 'gap-1.5' },
  md: { badge: 'h-8 w-8 rounded-xl',   text: 'text-[17px]',  gap: 'gap-2'   },
  lg: { badge: 'h-9 w-9 rounded-2xl',  text: 'text-xl',      gap: 'gap-2.5' },
} as const

/**
 * Mathematically precise 5-point star.
 * Centre (12,12), outer r=9, inner r=3.8 — evenly distributed 72° each.
 */
const STAR_PATH =
  'M12 3L14.233 8.926L20.559 9.219L15.616 13.174L17.291 19.282L12 15.8L6.709 19.282L8.384 13.174L3.441 9.219L9.767 8.926Z'

/**
 * Standalone icon badge — import this when you need just the mark
 * and handle the Link wrapper yourself.
 */
export function LogoMark({
  size = 'md',
  glow = true,
}: {
  size?: keyof typeof sizeMap
  glow?: boolean
}) {
  const { badge } = sizeMap[size]
  return (
    <span
      className={[
        'relative flex shrink-0 items-center justify-center overflow-hidden',
        'bg-gradient-to-br from-[#f0b84a] via-[#e0a030] to-[#c07618]',
        badge,
        glow
          ? 'shadow-[0_3px_16px_rgba(212,136,26,0.55),inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-1px_0_rgba(0,0,0,0.14)]'
          : '',
      ].join(' ')}
    >
      {/* Top-shine overlay — no SVG gradient ID needed */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[inherit] bg-gradient-to-b from-white/30 to-transparent" />

      {/* Star mark */}
      <svg
        viewBox="0 0 24 24"
        className="relative h-[60%] w-[60%]"
        aria-hidden="true"
        fill="none"
      >
        {/* Shadow layer — subtle offset for depth */}
        <path
          d={STAR_PATH}
          fill="rgba(0,0,0,0.22)"
          transform="translate(0.4,0.6)"
        />
        {/* Main star body */}
        <path d={STAR_PATH} fill="rgba(5,15,23,0.87)" />
        {/* Top-face highlight */}
        <path
          d="M12 3L14.233 8.926L12 10.8L9.767 8.926Z"
          fill="rgba(255,255,255,0.20)"
        />
      </svg>
    </span>
  )
}

/** Full logo: badge mark + "CelebStarsHub" wordmark */
export default function Logo({
  size = 'md',
  showText = true,
  href = '/',
  className = '',
  textClass = '',
}: LogoProps) {
  const { text, gap } = sizeMap[size]

  const inner = (
    <span className={`inline-flex select-none items-center ${gap} ${className}`}>
      {showText && (
        <span
          className={`font-display ${text} font-extrabold leading-none tracking-tight ${textClass}`}
        >
          <span className="text-white">Celeb</span>
          <span className="bg-gradient-to-r from-[#f0b84a] to-[#d4881a] bg-clip-text text-transparent">
            Stars
          </span>
          <span className="text-white/75">Hub</span>
        </span>
      )}
    </span>
  )

  if (href === false) return inner
  return (
    <Link href={href} className="group">
      {inner}
    </Link>
  )
}
