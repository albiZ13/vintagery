'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48)
    window.addEventListener('scroll', fn, { passive: true })
    fn()
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? 'bg-espresso/98 backdrop-blur-md' : ''
    }`}>
      <div className="max-w-5xl mx-auto px-4 h-[64px] flex items-center justify-between">
        <Link href="/" className="font-serif font-bold text-parchment tracking-[-0.01em]" style={{ fontSize: '18px' }}>
          <span className="text-gold">V</span>intagery
        </Link>

        <div className="flex items-center gap-5">
          <Link href="/auth/login"
            className="text-[13px] font-medium text-parchment/55 hover:text-parchment transition-colors">
            Accedi
          </Link>
          <Link href="/auth/register"
            className="text-[13px] font-semibold bg-gold text-espresso px-5 py-2 rounded-full hover:bg-[#d4a84c] transition-colors whitespace-nowrap shadow-[0_2px_12px_rgba(201,145,58,0.3)]">
            Iscriviti gratis
          </Link>
        </div>
      </div>
    </nav>
  )
}
