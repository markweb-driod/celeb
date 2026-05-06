import Link from 'next/link'

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showText?: boolean
  /** Pass false to render without a wrapping Link (use when you wrap in your own Link) */
  href?: string | false
  className?: string
  textClass?: string
}

const sizes = {
  xs: { badge: 'h-7  w-7  rounded-lg',  icon: 'h-3.5 w-3.5',      text: 'text-sm'      },
  sm: { badge: 'h-7  w-7  rounded-xl',  icon: 'h-3.5 w-3.5',      text: 'text-sm'      },
  md: { badge: 'h-8  w-8  rounded-xl',  icon: 'h-4   w-4',         text: 'text-[17px]'  },
  lg: { badge: 'h-9  w-9  rounded-2xl', icon: 'h-[18px] w-[18px]', text: 'text-xl'      },
} as const

/**
 * Standalone icon badge — import this when you need just the mark
 * and handle the Link wrapper yourself.
 */
export function LogoMark({
  size = 'md',
  glow = true,
}: {
  size?: keyof typeof sizes
  glow?: boolean
}) {
  const { badge, icon } = sizes[size]
  return (
    <span
      className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-amber to-amber-lt ${badge}${
        glow ? ' shadow-[0_4px_18px_rgba(255,177,27,0.42)]' : ''
      }`}
    >
      <svg
        className={`${icon} text-[#07161e]`}
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        {/* Refined 5-pt star — outer r=9.5, inner r=4, centre (12,12) */}
        <path d="M12 2.5L14.35 8.76L21.04 9.07L15.8 13.24L17.58 19.69L12 16L6.42 19.69L8.2 13.24L2.96 9.07L9.65 8.76Z" />
        {/* Sparkle accents */}
        <circle cx="20.5" cy="4.5" r="1" opacity=".45" />
        <circle cx="19.2" cy="2.2" r=".6" opacity=".30" />
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
  const { text } = sizes[size]

  const inner = (
    <span className={`inline-flex select-none items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      {showText && (
        <span
          className={`font-display ${text} font-extrabold tracking-tight text-white ${textClass}`}
        >
          CelebStarsHub
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
