import { getSeoMetadata, getJsonLdSchema, JsonLd } from "@/lib/seo";

export async function generateMetadata() {
  return await getSeoMetadata("doctors");
}

export default async function DoctorsLayout({ children }) {
  const jsonLd = await getJsonLdSchema("doctors");
  return (
    <>
      <JsonLd data={jsonLd} />
      {children}
    </>
  );
}
