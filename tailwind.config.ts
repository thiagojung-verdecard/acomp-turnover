import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

const baseSans = defaultTheme?.fontFamily?.sans ?? ['ui-sans-serif', 'system-ui', 'sans-serif']
const baseMono = defaultTheme?.fontFamily?.mono ?? ['ui-monospace', 'SFMono-Regular', 'monospace']

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1e3a5f',
          50: '#f0f4f8',
          100: '#dce3ed',
          600: '#1e3a5f',
          700: '#152d47',
        },
        accent: {
          DEFAULT: '#0284c7',
          light: '#dbeafe',
        },
        success: {
          DEFAULT: '#16a34a',
          light: '#dcfce7',
        },
        warning: {
          DEFAULT: '#d97706',
          light: '#fef3c7',
        },
        danger: {
          DEFAULT: '#dc2626',
          light: '#fee2e2',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', ...baseSans],
        mono: ['JetBrains Mono', ...baseMono],
      },
      borderRadius: {
        lg: '14px',
        md: '8px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,.06), 0 4px 14px rgba(0,0,0,.05)',
        md: '0 8px 24px rgba(0,0,0,.09)',
      },
    },
  },
  plugins: [],
}

export default config
