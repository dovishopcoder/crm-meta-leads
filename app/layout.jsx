import "./globals.css";

export const metadata = {
  title: "NextTouch CRM",
  description: "CRM simplu pentru lead-uri Facebook si Instagram",
  icons: {
    icon: "/nexttouch-icon.png",
    shortcut: "/nexttouch-icon.png",
    apple: "/nexttouch-icon.png"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body>
        {children}
        <footer className="site-footer">
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="/terms-of-service">Terms of Service</a>
          <a href="/data-deletion">Data Deletion Instructions</a>
        </footer>
      </body>
    </html>
  );
}
