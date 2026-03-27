"use client";

import dynamic from "next/dynamic";

const PortfolioTracker = dynamic(
  () => import("../components/PortfolioTracker"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          minHeight: "100vh",
          background: "#0c0e10",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p
          style={{
            color: "#404858",
            fontFamily: "-apple-system, sans-serif",
            fontSize: 13,
            letterSpacing: 0.5,
          }}
        >
          Loading…
        </p>
      </div>
    ),
  }
);

export default function Page() {
  return <PortfolioTracker />;
}
