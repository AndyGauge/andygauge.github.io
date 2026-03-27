/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./_layouts/**/*.html",
    "./_includes/**/*.html",
    "./_posts/**/*.md",
    "./*.html",
    "./*.md"
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Noto Sans', 'Helvetica', 'Arial', 'sans-serif'],
        'mono': ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Consolas', 'Liberation Mono', 'Menlo', 'monospace'],
      },
      colors: {
        // GitHub-inspired color palette
        github: {
          'bg': '#ffffff',
          'bg-secondary': '#f6f8fa',
          'border': '#d0d7de',
          'border-muted': '#d8dee4',
          'text': '#24292f',
          'text-secondary': '#656d76',
          'text-muted': '#8b949e',
          'accent': '#0969da',
          'accent-hover': '#0860ca',
          'accent-muted': '#0969da1a',
          'success': '#1a7f37',
          'warning': '#9a6700',
          'danger': '#da3633',
          'neutral': '#6e7781',
        },
        // Mastodon-inspired accent colors
        mastodon: {
          'purple': '#6364ff',
          'purple-light': '#f0f0ff',
          'purple-dark': '#4c4dff',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        }
      },
      boxShadow: {
        'github': '0 1px 0 rgba(27, 31, 36, 0.04)',
        'github-lg': '0 8px 24px rgba(140, 149, 159, 0.2)',
        'github-xl': '0 16px 48px rgba(140, 149, 159, 0.24)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
