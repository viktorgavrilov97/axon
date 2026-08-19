import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ClientRoot } from "./ClientRoot";

// Suisse International - основной шрифт
const suisse = localFont({
  src: [
    {
      path: '../../public/fonts/Suisse/SuisseIntl-Light.otf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Suisse/SuisseIntl-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Suisse/SuisseIntl-Book.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Suisse/SuisseIntl-Medium.otf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Suisse/SuisseIntl-SemiBold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-suisse',
  display: 'swap',
});

// Coinbase Display - для больших размеров (> 20px) - ЗАРЕЗЕРВИРОВАНО
// const coinbaseDisplay = localFont({
//   src: [
//     {
//       path: '../../public/fonts/Coinbase-Display/Coinbase_Display-Extra_Light-web-1.32.woff2',
//       weight: '200',
//       style: 'normal',
//     },
//     {
//       path: '../../public/fonts/Coinbase-Display/Coinbase_Display-Light-web-1.32.woff2',
//       weight: '300',
//       style: 'normal',
//     },
//     {
//       path: '../../public/fonts/Coinbase-Display/Coinbase_Display-Regular-web-1.32.woff2',
//       weight: '400',
//       style: 'normal',
//     },
//     {
//       path: '../../public/fonts/Coinbase-Display/Coinbase_Display-Medium-web-1.32.woff2',
//       weight: '500',
//       style: 'normal',
//     },
//     {
//       path: '../../public/fonts/Coinbase-Display/Coinbase_Display-Bold-web-1.32.woff2',
//       weight: '700',
//       style: 'normal',
//     },
//   ],
//   variable: '--font-coinbase-display',
//   display: 'swap',
// });

// Coinbase Sans - для меньших размеров (<= 20px) - ЗАРЕЗЕРВИРОВАНО
// const coinbaseSans = localFont({
//   src: [
//     {
//       path: '../../public/fonts/Coinbase-Sans/Coinbase_Sans-Extra_Light-web-1.32.woff2',
//       weight: '200',
//       style: 'normal',
//     },
//     {
//       path: '../../public/fonts/Coinbase-Sans/Coinbase_Sans-Light-web-1.32.woff2',
//       weight: '300',
//       style: 'normal',
//     },
//     {
//       path: '../../public/fonts/Coinbase-Sans/Coinbase_Sans-Regular-web-1.32.woff2',
//       weight: '400',
//       style: 'normal',
//     },
//     {
//       path: '../../public/fonts/Coinbase-Sans/Coinbase_Sans-Medium-web-1.32.woff2',
//       weight: '500',
//       style: 'normal',
//     },
//     {
//       path: '../../public/fonts/Coinbase-Sans/Coinbase_Sans-Bold-web-1.32.woff2',
//       weight: '700',
//       style: 'normal',
//     },
//   ],
//   variable: '--font-coinbase-sans',
//   display: 'swap',
// });

// TimesNow - для largetitle
const timesNow = localFont({
  src: [
    {
      path: '../../public/fonts/TimesNow/times-now-light.otf',
      weight: '300',
      style: 'normal',
    },
  ],
  variable: '--font-times-now',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Axon | Investment Platform",
  description: "Investment platform with real strategies and daily returns",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body 
        className={`${suisse.variable} ${timesNow.variable} bg-surface-900 text-white-900`}
        suppressHydrationWarning
      >
        <ClientRoot>
          {children}
        </ClientRoot>
      </body>
    </html>
  );
}

