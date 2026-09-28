# AGENTS.md

## Primary Database: AWS RDS PostgreSQL
- The real database for this application is **AWS RDS PostgreSQL** (configured in `.env.local` via `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
- Database client to use: `import sql from "@/lib/db";`
- **DO NOT rely on Supabase**. Supabase is deprecated/not used for project data.
- All users, authentication records, chemist details, lab details, and activity logs must be queried and created directly in AWS RDS.
