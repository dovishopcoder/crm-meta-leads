import { LegalPage } from "../legal-page";
import { legalPages } from "../legal-copy";

export const metadata = {
  title: "Privacy Policy | NextTouch CRM"
};

export default function PrivacyPolicyPage() {
  return <LegalPage page={legalPages.privacy} />;
}

