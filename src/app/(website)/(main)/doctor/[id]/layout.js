import { getSeoMetadata, getJsonLdSchema, JsonLd } from "@/lib/seo";
import sql from "@/lib/db";

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const docId = resolvedParams?.id;
  let docName = "Doctor Profile";
  let docSpeciality = "Specialist";
  try {
    const [doc] = await sql`
      SELECT full_name, specialization FROM doctor_details WHERE id = ${docId} LIMIT 1
    `;
    if (doc) {
      docName = doc.full_name;
      docSpeciality = doc.specialization || "Specialist";
    }
  } catch {}

  return await getSeoMetadata("doctor-detail", {
    title: `${docName} - ${docSpeciality} | MediConnect`,
    description: `Book consultation with ${docName}, ${docSpeciality} on MediConnect. Verified credentials, transparent fees, and confirmed video or in-clinic slots.`,
  });
}

export default async function DoctorDetailLayout({ children }) {
  const jsonLd = await getJsonLdSchema("doctor-detail");
  return (
    <>
      <JsonLd data={jsonLd} />
      {children}
    </>
  );
}
