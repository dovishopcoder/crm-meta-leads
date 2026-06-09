import { LegalPage } from "../legal-page";
import { legalPages } from "../legal-copy";

export const metadata = {
  title: "Data Deletion Instructions | NextTouch CRM"
};

export default function DataDeletionPage() {
  return <LegalPage page={legalPages.deletion} />;
}

