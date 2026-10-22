# AGENTS.md

## Primary Database: AWS RDS PostgreSQL
- The real database for this application is **AWS RDS PostgreSQL** (configured in `.env.local` via `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
- Database client to use: `import sql from "@/lib/db";`
- **DO NOT rely on Supabase**. Supabase is deprecated/not used for project data.
- All users, authentication records, chemist details, lab details, and activity logs must be queried and created directly in AWS RDS.

## UI & Button Guidelines (System-Wide Rule)
- **Keep button text short and concise** across the entire website and all modules.
- **Never use long, verbose text inside buttons**. For example:
  - Use `Continue` instead of `Continue with <Doctor Name>`
  - Use `Book Slot` or `Book Now` instead of `Book Appointment With This Doctor`
  - Use `Enter Hub` / `CardioConnect` / `LungConnect` instead of `Enter CardioConnect Program Now`
  - Use `Move`, `Training`, `Walk Test`, `Breathing` instead of long descriptive titles on action buttons
  - Use `Change Doctor` instead of `Choose Different Doctor`
- Buttons must always remain mobile-responsive, clear, and easy to tap without awkward text wrapping or truncation.

## Color & Styling Guidelines (System-Wide Rule: NO Gradients)
- **DO NOT use gradient colors** anywhere in the UI (avoid `bg-gradient-to-...`, `from-... to-...`, `via-...`).
- Use **solid, crisp, professional colors** (e.g. solid MediConnect blue `#0067A1`, solid emerald `#059669`, crisp white backgrounds, subtle border lines `#E2E8F0` / `#CBD5E1`).
- Solid colors ensure maximum readability, clean aesthetics, and professional healthcare design.
- *Prescription Exception*: The Prescription modal top bar (`from-[#0067A1] to-[#005282]`) and official A4 medical prescription letterhead (`linear-gradient(135deg, #66baf7 0%, #62bcfb 100%)`) must retain their original established background styling as requested.

