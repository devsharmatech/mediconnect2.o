import { getSeoMetadata, getJsonLdSchema, JsonLd } from "@/lib/seo";

export async function generateMetadata() {
  return await getSeoMetadata("terms");
}

export default async function TermsLayout({ children }) {
  const jsonLd = await getJsonLdSchema("terms");
  return (
    <>
      <JsonLd data={jsonLd} />
      {children}
    </>
  );
}
