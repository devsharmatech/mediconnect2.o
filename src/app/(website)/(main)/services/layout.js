import { getSeoMetadata, getJsonLdSchema, JsonLd } from "@/lib/seo";

export async function generateMetadata() {
  return await getSeoMetadata("services");
}

export default async function ServicesLayout({ children }) {
  const jsonLd = await getJsonLdSchema("services");
  return (
    <>
      <JsonLd data={jsonLd} />
      {children}
    </>
  );
}
