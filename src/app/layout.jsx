import "./globals.css";

export const metadata = {
  title: "LocalDrop — P2P Local File & Snippet Transfer",
  description:
    "Send files and code snippets directly between your devices over WebRTC. No accounts, no cloud storage, no size limits.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
