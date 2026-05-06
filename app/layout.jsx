import "./globals.css";

export const metadata = {
  title: "Meta Leads CRM",
  description: "CRM simplu pentru lead-uri Facebook si Instagram"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
