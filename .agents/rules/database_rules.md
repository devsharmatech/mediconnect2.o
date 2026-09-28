# Database Architecture & Source of Truth Rules

## 1. Primary Database
- **Active Real Database**: **AWS RDS PostgreSQL**
- **Connection Module**: `import sql from "@/lib/db";`
- **Host**: AWS RDS instance (`mediconnect-stag-db.*.ap-south-1.rds.amazonaws.com` configured in `.env.local`)
- **Driver**: `postgres` (PostgreSQL client)

## 2. Strict Constraints
- **NO Supabase Database Dependency**:
  - The project does NOT use Supabase as its database.
  - All real user data, auth data, assessments, chemist records, lab records, orders, and telemetry live directly in **AWS RDS PostgreSQL**.
  - Any new tables, columns, test accounts, and data modifications MUST be created directly in AWS RDS using `@/lib/db`.
- **SQL Execution**:
  - All database queries, schema inspections, table alterations, and inserts MUST use `sql` from `@/lib/db`.
