import Image from 'next/image'

interface Props {
  logoUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
}

export default function EventLogo({ logoUrl, size = 'md' }: Props) {
  const sizes = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-28 h-28',
  }

  return (
    <div className={`relative ${sizes[size]} flex items-center justify-center flex-shrink-0`}>
      {logoUrl ? (
        <Image src={logoUrl} alt="" fill className="object-contain" unoptimized />
      ) : (
        <span className="font-script text-[var(--gold-dark)] text-3xl leading-none">FL</span>
      )}
    </div>
  )
}
