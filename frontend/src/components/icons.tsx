/** Inline stroke icons — keeps the bundle free of an icon dependency. */
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 18, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...rest,
  }
}

export const HomeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 10.5L12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </svg>
)

export const MarketIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 21V10M10 21V6M16 21v-8M22 21V4" />
    <path d="M2 21h20" />
  </svg>
)

export const ProduceIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 21c0-6 3-11 9-13-1 7-4 11-9 13z" />
    <path d="M12 21c0-5-2.5-9-8-10.5C4.5 16 7.5 20 12 21z" />
    <path d="M12 21v-4" />
  </svg>
)

export const OrdersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 2h9l5 5v15H6z" />
    <path d="M15 2v5h5" />
    <path d="M9.5 13.5l1.8 1.8 3.4-3.4" />
  </svg>
)

export const BarterIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 8h13l-3-3" />
    <path d="M20 16H7l3 3" />
  </svg>
)

export const ChatIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" />
  </svg>
)

export const LeafIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20c0-8 5-14 16-15 0 10-5 15-13 15H4z" />
    <path d="M9 19c1.5-4 4-7 8-9" />
  </svg>
)

export const SchemeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 2l3 6 6 .9-4.4 4.2 1 6.2L12 16.6 6.4 19.3l1-6.2L3 8.9 9 8z" />
  </svg>
)

export const BellIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6z" />
    <path d="M10.3 20a2 2 0 0 0 3.4 0" />
  </svg>
)

export const UserIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </svg>
)

export const GlobeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" />
  </svg>
)

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const MicIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
  </svg>
)

export const SpeakerIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 9v6h4l5 4V5L8 9H4z" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7" />
  </svg>
)

export const SendIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 3L10.5 13.5" />
    <path d="M21 3l-6.5 18-4-8-8-4L21 3z" />
  </svg>
)

export const CameraIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 8h3.5L8 5.5h8L17.5 8H21v12H3z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </svg>
)

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </svg>
)

export const LocationIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
)

export const SunIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
  </svg>
)

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)

export const AlertIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l9.5 17H2.5z" />
    <path d="M12 9.5v4.5M12 17.2v.1" />
  </svg>
)

export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </svg>
)

export const EditIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20h4L20 8l-4-4L4 16z" />
  </svg>
)

export const LogoutIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M15 4h4v16h-4" />
    <path d="M11 8l-4 4 4 4M7 12h10" />
  </svg>
)

export const MenuIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
)

export const WheatIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 22V9" />
    <path d="M12 9c0-2 1.2-3.6 3-4.5C15 6.5 13.8 8.1 12 9z" />
    <path d="M12 9C12 7 10.8 5.4 9 4.5c0 2 1.2 3.6 3 4.5z" />
    <path d="M12 14c0-2 1.2-3.6 3-4.5 0 2-1.2 3.6-3 4.5z" />
    <path d="M12 14c0-2-1.2-3.6-3-4.5 0 2 1.2 3.6 3 4.5z" />
  </svg>
)
