export const metadata = {
  title: "Gridmatic | Portfolio Performance",
  description:
    "Live automated grid trading performance — 100% reinvest strategy, Jan 2022 to present.",
  openGraph: {
    title: "Gridmatic | Portfolio Performance",
    description:
      "Live automated grid trading performance — 100% reinvest strategy, Jan 2022 to present.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#0c0e10" }}>
        {children}
      </body>
    </html>
  );
}
