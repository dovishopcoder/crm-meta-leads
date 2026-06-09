import { LegalPage } from "../legal-page";
import { legalPages } from "../legal-copy";

export const metadata = {
  title: "Terms of Service | NextTouch CRM"
};

export default function TermsOfServicePage() {
  return <LegalPage page={legalPages.terms} />;
}

