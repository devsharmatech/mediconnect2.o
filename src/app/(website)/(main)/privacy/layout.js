import { getSeoMetadata, getJsonLdSchema, JsonLd } from "@/lib/seo";

export async function generateMetadata() {
  return await getSeoMetadata("privacy");
}

export default async function PrivacyLayout({ children }) {
  const jsonLd = await getJsonLdSchema("privacy");
  return (
    <>
      <JsonLd data={jsonLd} />
      {children}
    </>
  );
}
