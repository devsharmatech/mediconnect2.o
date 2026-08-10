# MediConnect.fit - Connected Healthcare Platform

MediConnect is a comprehensive, secure, and integrated digital healthcare ecosystem designed for patient-led care in India. It unites patients, doctors, chemists, labs, and administrative authorities into a single, seamless platform. 

The platform is designed to make healthcare easier by helping patients manage doctor consultations, diagnostics, digital records (ABHA/ABDM), and follow-ups in one place, saving time, reducing anxiety, and supporting honest, doctor-led medical advice.

---

## 🚀 Key Features & Modules

* **Patient Care & Appointments:** Search and book verified doctors by specialty for both in-clinic and video consultations (powered by Agora).
* **ABHA / ABDM Integration:** Ayushman Bharat Health Account (ABHA) creation and management aligned with the National Health Authority (NHA) of India to securely store and share digital health records.
* **Onboarding Portals:** Streamlined, secure onboarding workflows for:
  * Doctors (including DigiLocker KYC verification, email verification, and agreement signatures)
  * Chemists / Pharmacies
  * Laboratories
* **Wellness Suites:** Digital wellness assessments and modules like CardioConnect and LungConnect.
* **Supportive Clinical Tools:** Guided symptom checks and health insights summaries to support doctor-led decisions.

---

## 🛠️ Technology Stack

* **Frontend Framework:** Next.js (App Router)
* **Styling:** Tailwind CSS & Vanilla CSS (curated high-end clinical theme)
* **Database:** AWS RDS (PostgreSQL)
* **File Storage & CDN:** AWS S3 & Amazon CloudFront
* **Real-time Video:** Agora RTC
* **Payment Gateway:** Razorpay
* **Push Notifications:** Firebase Cloud Messaging (FCM)
* **Email System:** NodeMailer via SMTP (Hostinger)

---

## ⚙️ Environment Configuration

To run the application locally or deploy to production, create a `.env.local` file in the root directory with the following variables:

```bash
# AWS RDS PostgreSQL Database Configuration
DB_HOST=your_aws_rds_host
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=mediconnect
DB_SSL=true

# AWS S3 Storage & CloudFront Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_S3_BUCKET_NAME=your_s3_bucket_name
AWS_REGION=ap-south-1
NEXT_PUBLIC_CLOUDFRONT_URL=https://your_cloudfront_domain.net

# SMTP Configuration (Emails)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
SMTP_FROM=your_smtp_sender_email

# Firebase Admin Configuration (Push Notifications)
FCM_PROJECT_ID=your_fcm_project_id
FCM_CLIENT_EMAIL=your_fcm_client_email
FCM_PRIVATE_KEY="your_fcm_private_key"

# Agora Configuration (Video Calls)
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate

# Security Keys
CRON_SECRET=your_configured_cron_secret

# Legacy / External Client Configs (if needed)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

---

## ⏰ Cron Job APIs & Deployment

MediConnect utilizes automated background workers to handle notifications, retries, data syncs, and metrics. These endpoints are configured as Serverless Cron jobs in Vercel.

### 🔒 Security & Authentication
All Cron endpoints are protected by the `CRON_SECRET` environment variable. To trigger these endpoints, scheduler services must invoke them using a **POST** request with an authorization header:
```http
Authorization: Bearer <CRON_SECRET>
```

### 📅 Configured Schedules (vercel.json)
The following cron jobs are automatically registered when deploying the repository to Vercel:

| Endpoint Path | Schedule (UTC) | Schedule Description | Core Purpose |
| :--- | :--- | :--- | :--- |
| `/api/cron/notifications` | `0 0 * * *` | Daily at 00:00 | Polls and processes pending email/push notification queues. |
| `/api/cron/retry` | `15 0 * * *` | Daily at 00:15 | Retries failed operations using exponential backoff logic. |
| `/api/cron/offline-sync` | `30 0 * * *` | Daily at 00:30 | Syncs local/offline health data entries back to central tables. |
| `/api/cron/followup` | `30 3 * * *` | Daily at 03:30 | Generates doctor-led patient follow-up alerts and reminders. |
| `/api/cron/metrics` | `35 18 * * *` | Daily at 18:35 | Aggregates system metrics (appointments, registrations, consultations). |
| `/api/cron/provider-ranking` | `30 20 * * *` | Daily at 20:30 | Recalculates doctor and clinic search/ranking index based on feedback. |
| `/api/cron/outbox-processor` | `0 4 * * *` | Daily at 04:00 | Processes outbox transactions for event-driven reliability. |
| `/api/cron/engagement-sync` | `0 5 * * *` | Daily at 05:00 | Synchronizes engagement data, feedback metrics, and patient interactions. |

### 🛠️ Additional Cron Workers
The codebase also includes additional handlers under `src/app/api/cron/` that can be mapped if needed:
* **`/api/cron/appointment-reminders`**: Sends upcoming visit reminders to patients.
* **`/api/cron/payment-reconciler`**: Reconciles Razorpay status for pending orders.
* **`/api/cron/consultation-timeout`**: Auto-closes active appointments that have expired.

### 🧪 Manual Testing & Invocation
You can trigger these crons manually using `curl` or tools like Postman to test the backend processing:

```bash
# Trigger Notification Queue Processing
curl -X POST https://your-deployment.vercel.app/api/cron/notifications \
  -H "Authorization: Bearer your_cron_secret"

# Trigger Retry Operations
curl -X POST https://your-deployment.vercel.app/api/cron/retry \
  -H "Authorization: Bearer your_cron_secret"
```

---

## ⚕️ Standards & Compliance

* **NMC Compliant:** Professional onboarding matches National Medical Commission guidelines.
* **ABDM / NHA Aligned:** Health record sharing is designed to conform to India's digital health infrastructure standards.
* **ISO 9001:2015:** Adheres to Quality Management System criteria.
* **ISO 27001:2022:** Implements security management controls for healthcare information safety.
