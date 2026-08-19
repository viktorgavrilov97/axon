import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/shared/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        'sidebar': '1200px', // Breakpoint for sidebar/tabbar switch
        'sidebar-lg': '1300px', // Breakpoint for larger sidebar width
        'yield': '1400px', // Breakpoint for Yield Multiplayer layout
      },
      fontFamily: {
        'suisse': ['var(--font-suisse)', 'sans-serif'],
        'times-now': ['var(--font-times-now)', 'serif'],
        // Coinbase - зарезервировано для возврата
        // 'coinbase-display': ['var(--font-coinbase-display)', 'sans-serif'],
        // 'coinbase-sans': ['var(--font-coinbase-sans)', 'sans-serif'],
      },
      fontWeight: {
        light: '300',
        regular: '400',
        book: '500',
        medium: '600',
        semibold: '700',
      },
      fontSize: {
        // > 20px - используем Coinbase Display (настроено через CSS)
        largetitle: ['36px', {
          lineHeight: '100%',
          letterSpacing: '-0.00em',
          fontWeight: '400',
        }],
        largetitle2: ['30px', {
          lineHeight: '100%',
          letterSpacing: '-0.00em',
          fontWeight: '400',
        }],
        display: ['20px', {
          lineHeight: '140%',
          letterSpacing: '-0.00em',
          fontWeight: '400',
        }],
        heading: ['16px', {
          lineHeight: '140%',
          letterSpacing: '0em',
          fontWeight: '400',
        }],
        // <= 20px - используем Coinbase Sans (настроено через CSS)
        subheading: ['18px', {
          lineHeight: '100%',
          letterSpacing: '0em',
          fontWeight: '400',
        }],
        subheading2: ['16px', {
          lineHeight: '100%',
          letterSpacing: '0em',
          fontWeight: '400',
        }],
        body: ['14px', {
          lineHeight: '160%',
          letterSpacing: '0em',
          fontWeight: '400',
        }],
        callout: ['13px', {
          lineHeight: '140%',
          letterSpacing: '0em',
          fontWeight: '500',
        }],
        caption: ['13px', {
          lineHeight: '160%',
          letterSpacing: '0em',
          fontWeight: '500',
        }],
        small: ['13px', {
          lineHeight: '160%',
          letterSpacing: '0em',
          fontWeight: '400',
        }],
      },
      colors: {
        white: {
          500: '#464646',
          600: '#676767',
          700: '#676767',
          800: '#DDDDDD',
          900: '#E8E8E8',
        },
        surface: {
          800: '#161616',
          900: '#000000',
        },
        onsurface: {
          800: 'rgba(255, 255, 255, 0.15)',
          850: 'rgba(255, 255, 255, 0.12)',
          900: 'rgba(255, 255, 255, 0.10)',
          950: 'rgba(255, 255, 255, 0.05)',
        },
        redhaze: '#f0616d',
        mint: '#99FFC2',
        olive: '#7FFF00',
        yellow: '#FFFF7F',
        'primary-button': '#2e31b7b3',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};

export default config;

