# MediConnect AWS RDS -> Supabase Schema Exporter

This directory contains the automated tool to export a clean, 100% Supabase-compatible SQL schema clone from AWS RDS PostgreSQL.

---

## What is Exported? (Schema Only - No Application Data)
1. **Extensions**: `uuid-ossp`, `pgcrypto`, `pg_trgm`
2. **Custom Enums & Types**: (`chemist_onboarding_status`, etc.)
3. **Sequences**: All sequences with min/max, start, and increment
4. **Stored Functions & Procedures**: All 28 system functions with exact source definitions
5. **Tables & Columns**: All 236 tables with exact types, defaults, and identity columns
6. **Primary Keys & Unique Constraints**: `PRIMARY KEY`, `UNIQUE`, and `CHECK` constraints
7. **Foreign Keys**: Placed at the end via `ALTER TABLE` to avoid dependency/order issues
8. **Indexes**: All standalone, partial, and sorted indexes
9. **Triggers**: All 21 custom triggers
10. **Views**: Any custom public views

---

## How to Run:

### Step 1: Whitelist your IP in AWS RDS
AWS RDS security groups block incoming connections by default unless your current public IP is whitelisted.
- Current Public IP: `117.99.8.23`
- AWS Console ➔ RDS ➔ Databases (`mediconnect-stag-db`) ➔ Connectivity & Security ➔ Click VPC Security Group ➔ **Edit Inbound Rules** ➔ Add **PostgreSQL (Port 5432)** from `117.99.8.23/32` (or "My IP").

### Step 2: Run the Exporter
Execute in terminal:
```powershell
node --env-file=.env.local database_schema/export_schema.mjs
```

The output file `database_schema/schema.sql` will be generated immediately.

---

## Alternative: Run via Supabase CLI
Once your IP is whitelisted:
```powershell
npx supabase@latest db dump --db-url "postgresql://postgres:vcMQixBUD7XldJsxFkJQ@mediconnect-stag-db.c7iqgcom8eml.ap-south-1.rds.amazonaws.com:5432/mediconnect" -f database_schema/schema.sql
```
