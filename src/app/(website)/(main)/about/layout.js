import { getSeoMetadata, getJsonLdSchema, JsonLd } from "@/lib/seo";

export async function generateMetadata() {
  return await getSeoMetadata("about");
}

export default async function AboutLayout({ children }) {
  const jsonLd = await getJsonLdSchema("about");
  return (
    <>
      <JsonLd data={jsonLd} />
      {children}
    </>
  );
}
