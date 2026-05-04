import type { Metadata } from "next";
import type { ReactNode } from "react";
import "react-day-picker/style.css";
import "./styles.scss";

export const metadata: Metadata = {
  title: "DI Tracker",
  description: "Dual Investment operating system and performance ledger"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
