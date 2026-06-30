import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Palette old money — navy + brick red + ivory
        cream:      '#F0EDE6',
        parchment:  '#FDFBF7',
        espresso:   '#0F2040',
        coffee:     '#1C3560',
        sienna:     '#B53A1E',
        gold:       '#C4A030',
        rust:       '#8C2E18',
        muted:      '#607090',
        border:     '#D8D2CA',
        'border-strong': '#B8AFA4',
        surface:    '#FFFFFF',
        'surface-soft': '#F5F2EC',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'Times New Roman', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // display scale — ispirato a Linear
        'display-xl': ['52px', { lineHeight: '1.08', letterSpacing: '-1.5px', fontWeight: '700' }],
        'display-lg': ['40px', { lineHeight: '1.10', letterSpacing: '-1.0px', fontWeight: '700' }],
        'display-md': ['32px', { lineHeight: '1.15', letterSpacing: '-0.6px', fontWeight: '600' }],
        'display-sm': ['24px', { lineHeight: '1.25', letterSpacing: '-0.3px', fontWeight: '600' }],
        'body-lg':    ['18px', { lineHeight: '1.55', letterSpacing: '-0.1px' }],
        'body':       ['16px', { lineHeight: '1.55' }],
        'body-sm':    ['14px', { lineHeight: '1.5' }],
        'caption':    ['12px', { lineHeight: '1.4', letterSpacing: '0.2px' }],
        'eyebrow':    ['11px', { lineHeight: '1.3', letterSpacing: '1.2px', fontWeight: '600' }],
      },
      borderRadius: {
        // Linear spacing
        xs:   '4px',
        sm:   '6px',
        DEFAULT: '8px',
        md:   '8px',
        lg:   '12px',
        xl:   '16px',
        '2xl':'24px',
        pill: '9999px',
      },
      spacing: {
        // 8px grid
        xxs: '4px', xs: '8px', sm: '12px', md: '16px',
        lg: '24px', xl: '32px', xxl: '48px', section: '80px',
      },
      boxShadow: {
        card:   '0 1px 3px rgba(30,18,8,.07), 0 4px 12px rgba(30,18,8,.05)',
        'card-hover': '0 4px 16px rgba(30,18,8,.12), 0 1px 4px rgba(30,18,8,.08)',
        soft:   '0 2px 8px rgba(30,18,8,.06)',
      },
      keyframes: {
        'marquee-left':  { from: { transform: 'translateX(0)' },    to: { transform: 'translateX(-50%)' } },
        'marquee-right': { from: { transform: 'translateX(-50%)' }, to: { transform: 'translateX(0)' } },
      },
      animation: {
        'marquee-left':  'marquee-left 38s linear infinite',
        'marquee-right': 'marquee-right 42s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
