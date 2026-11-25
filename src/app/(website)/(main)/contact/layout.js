import { getSeoMetadata, getJsonLdSchema, JsonLd } from "@/lib/seo";

export async function generateMetadata() {
  return await getSeoMetadata("contact");
}

export default async function ContactLayout({ children }) {
  const jsonLd = await getJsonLdSchema("contact");
  return (
    <>
      <JsonLd data={jsonLd} />
      {children}
    </>
  );
}
