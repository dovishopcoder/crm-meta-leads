export function LegalPage({ page }) {
  return (
    <main className="legal-shell">
      <section className="legal-document">
        <a className="legal-back" href="/">Inapoi la CRM</a>
        <p className="eyebrow">NextTouch CRM</p>
        <h1>{page.title}</h1>
        <p className="legal-updated">{page.updatedAt}</p>
        <div className="legal-body">
          {page.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>
    </main>
  );
}

