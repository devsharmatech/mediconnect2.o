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
