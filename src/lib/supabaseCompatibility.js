import sql from './db.js';
export { sql };

const RELATION_MAP = {
  "activity_log": {
    "users": {
      "childTable": "users",
      "parentKey": "actor_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "actor_id",
      "childKey": "id",
      "isArray": false
    },
    "actor_id": {
      "childTable": "users",
      "parentKey": "actor_id",
      "childKey": "id",
      "isArray": false
    },
    "actor_id!inner": {
      "childTable": "users",
      "parentKey": "actor_id",
      "childKey": "id",
      "isArray": false
    },
    "actor": {
      "childTable": "users",
      "parentKey": "actor_id",
      "childKey": "id",
      "isArray": false
    },
    "actor!inner": {
      "childTable": "users",
      "parentKey": "actor_id",
      "childKey": "id",
      "isArray": false
    },
    "users!activity_log_actor_id_fkey": {
      "childTable": "users",
      "parentKey": "actor_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!activity_log_care_episode_id_fkey": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!activity_log_patient_id_fkey": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "users": {
    "activity_log": {
      "childTable": "activity_log",
      "parentKey": "id",
      "childKey": "actor_id",
      "isArray": true
    },
    "activity_log!activity_log_actor_id_fkey": {
      "childTable": "activity_log",
      "parentKey": "id",
      "childKey": "actor_id",
      "isArray": true
    },
    "activity_log!activity_log_patient_id_fkey": {
      "childTable": "activity_log",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "admin_details": {
      "childTable": "admin_details",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "admin_details!admin_details_id_fkey": {
      "childTable": "admin_details",
      "parentKey": "id",
      "childKey": "id",
      "isArray": true
    },
    "appointments": {
      "childTable": "appointments",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "appointments!appointments_doctor_id_fkey": {
      "childTable": "appointments",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "appointments!appointments_patient_id_fkey": {
      "childTable": "appointments",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "audit_log": {
      "childTable": "audit_log",
      "parentKey": "id",
      "childKey": "changed_by",
      "isArray": true
    },
    "audit_log!audit_log_changed_by_fkey": {
      "childTable": "audit_log",
      "parentKey": "id",
      "childKey": "changed_by",
      "isArray": true
    },
    "auth_sessions": {
      "childTable": "auth_sessions",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "auth_sessions!auth_sessions_user_id_fkey": {
      "childTable": "auth_sessions",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "bpl_requests": {
      "childTable": "bpl_requests",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "bpl_requests!bpl_requests_user_id_fkey": {
      "childTable": "bpl_requests",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "breathing_sessions": {
      "childTable": "breathing_sessions",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "breathing_sessions!breathing_sessions_user_id_fkey": {
      "childTable": "breathing_sessions",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "care_episodes": {
      "childTable": "care_episodes",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "care_episodes!care_episodes_patient_id_fkey": {
      "childTable": "care_episodes",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "chemist_details": {
      "childTable": "chemist_details",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_details!chemist_details_id_fkey": {
      "childTable": "chemist_details",
      "parentKey": "id",
      "childKey": "id",
      "isArray": true
    },
    "consultations": {
      "childTable": "consultations",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "consultations!consultations_doctor_id_fkey": {
      "childTable": "consultations",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "consultations!consultations_patient_id_fkey": {
      "childTable": "consultations",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "custom_diagnosis_review": {
      "childTable": "custom_diagnosis_review",
      "parentKey": "id",
      "childKey": "reviewed_by",
      "isArray": true
    },
    "custom_diagnosis_review!custom_diagnosis_review_reviewed_by_fkey": {
      "childTable": "custom_diagnosis_review",
      "parentKey": "id",
      "childKey": "reviewed_by",
      "isArray": true
    },
    "custom_diagnosis_review!custom_diagnosis_review_submitted_by_fkey": {
      "childTable": "custom_diagnosis_review",
      "parentKey": "id",
      "childKey": "submitted_by",
      "isArray": true
    },
    "digital_locker_audit_logs": {
      "childTable": "digital_locker_audit_logs",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "digital_locker_audit_logs!digital_locker_audit_logs_user_id_fkey": {
      "childTable": "digital_locker_audit_logs",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "digital_locker_documents": {
      "childTable": "digital_locker_documents",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "digital_locker_documents!digital_locker_documents_user_id_fkey": {
      "childTable": "digital_locker_documents",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "doctor_consents": {
      "childTable": "doctor_consents",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "doctor_consents!doctor_consents_doctor_id_fkey": {
      "childTable": "doctor_consents",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "doctor_details": {
      "childTable": "doctor_details",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!doctor_details_id_fkey": {
      "childTable": "doctor_details",
      "parentKey": "id",
      "childKey": "id",
      "isArray": true
    },
    "doctor_onboarding_status": {
      "childTable": "doctor_onboarding_status",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "doctor_onboarding_status!doctor_onboarding_status_doctor_id_fkey": {
      "childTable": "doctor_onboarding_status",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "doctor_otp_logs": {
      "childTable": "doctor_otp_logs",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "doctor_otp_logs!doctor_otp_logs_doctor_id_fkey": {
      "childTable": "doctor_otp_logs",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "doctor_session_agreement": {
      "childTable": "doctor_session_agreement",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "doctor_session_agreement!doctor_session_agreement_doctor_id_fkey": {
      "childTable": "doctor_session_agreement",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "doctor_verification_logs": {
      "childTable": "doctor_verification_logs",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "doctor_verification_logs!doctor_verification_logs_doctor_id_fkey": {
      "childTable": "doctor_verification_logs",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "doctor_verification_logs!doctor_verification_logs_verified_by_fkey": {
      "childTable": "doctor_verification_logs",
      "parentKey": "id",
      "childKey": "verified_by",
      "isArray": true
    },
    "document_verification_requests": {
      "childTable": "document_verification_requests",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "document_verification_requests!document_verification_requests_user_id_fkey": {
      "childTable": "document_verification_requests",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "email_verifications": {
      "childTable": "email_verifications",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "email_verifications!email_verifications_user_id_fkey": {
      "childTable": "email_verifications",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "financial_transaction_log": {
      "childTable": "financial_transaction_log",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "financial_transaction_log!financial_transaction_log_patient_id_fkey": {
      "childTable": "financial_transaction_log",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "health_assessments": {
      "childTable": "health_assessments",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "health_assessments!health_assessments_user_id_fkey": {
      "childTable": "health_assessments",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "health_challenges": {
      "childTable": "health_challenges",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "health_challenges!health_challenges_user_id_fkey": {
      "childTable": "health_challenges",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "home_visit_request": {
      "childTable": "home_visit_request",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "home_visit_request!home_visit_request_doctor_id_fkey": {
      "childTable": "home_visit_request",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "hospital_details": {
      "childTable": "hospital_details",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "hospital_details!hospital_details_user_id_fkey": {
      "childTable": "hospital_details",
      "parentKey": "id",
      "childKey": "id",
      "isArray": true
    },
    "incident": {
      "childTable": "incident",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "incident!incident_patient_id_fkey": {
      "childTable": "incident",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "incident!incident_resolved_by_fkey": {
      "childTable": "incident",
      "parentKey": "id",
      "childKey": "resolved_by",
      "isArray": true
    },
    "lab_activity_logs": {
      "childTable": "lab_activity_logs",
      "parentKey": "id",
      "childKey": "lab_id",
      "isArray": true
    },
    "lab_activity_logs!lab_activity_logs_lab_id_fkey": {
      "childTable": "lab_activity_logs",
      "parentKey": "id",
      "childKey": "lab_id",
      "isArray": true
    },
    "lab_details": {
      "childTable": "lab_details",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "lab_details!lab_details_id_fkey": {
      "childTable": "lab_details",
      "parentKey": "id",
      "childKey": "id",
      "isArray": true
    },
    "lab_order_consents": {
      "childTable": "lab_order_consents",
      "parentKey": "id",
      "childKey": "lab_id",
      "isArray": true
    },
    "lab_order_consents!lab_order_consents_lab_id_fkey": {
      "childTable": "lab_order_consents",
      "parentKey": "id",
      "childKey": "lab_id",
      "isArray": true
    },
    "lab_order_consents!lab_order_consents_patient_id_fkey": {
      "childTable": "lab_order_consents",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "lab_payment_logs": {
      "childTable": "lab_payment_logs",
      "parentKey": "id",
      "childKey": "lab_id",
      "isArray": true
    },
    "lab_payment_logs!lab_payment_logs_lab_id_fkey": {
      "childTable": "lab_payment_logs",
      "parentKey": "id",
      "childKey": "lab_id",
      "isArray": true
    },
    "lab_payment_logs!lab_payment_logs_patient_id_fkey": {
      "childTable": "lab_payment_logs",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "lab_reports": {
      "childTable": "lab_reports",
      "parentKey": "id",
      "childKey": "lab_id",
      "isArray": true
    },
    "lab_reports!lab_reports_lab_id_fkey": {
      "childTable": "lab_reports",
      "parentKey": "id",
      "childKey": "lab_id",
      "isArray": true
    },
    "lab_reports!lab_reports_patient_id_fkey": {
      "childTable": "lab_reports",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "lab_test_orders": {
      "childTable": "lab_test_orders",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "lab_test_orders!lab_test_orders_patient_id_fkey": {
      "childTable": "lab_test_orders",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "lab_tests": {
      "childTable": "lab_tests",
      "parentKey": "id",
      "childKey": "lab_id",
      "isArray": true
    },
    "lab_tests!lab_tests_lab_id_fkey": {
      "childTable": "lab_tests",
      "parentKey": "id",
      "childKey": "lab_id",
      "isArray": true
    },
    "medicine_orders": {
      "childTable": "medicine_orders",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "medicine_orders!medicine_orders_patient_id_fkey": {
      "childTable": "medicine_orders",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "medicine_order_payments": {
      "childTable": "medicine_order_payments",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "medicine_order_payments!mop_patient_fkey": {
      "childTable": "medicine_order_payments",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "notifications": {
      "childTable": "notifications",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "notifications!notifications_user_id_fkey": {
      "childTable": "notifications",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "nursing_lead_assignments": {
      "childTable": "nursing_lead_assignments",
      "parentKey": "id",
      "childKey": "assigned_by",
      "isArray": true
    },
    "nursing_lead_assignments!nursing_lead_assignments_assigned_by_fkey": {
      "childTable": "nursing_lead_assignments",
      "parentKey": "id",
      "childKey": "assigned_by",
      "isArray": true
    },
    "ops_task": {
      "childTable": "ops_task",
      "parentKey": "id",
      "childKey": "assigned_to",
      "isArray": true
    },
    "ops_task!ops_task_assigned_to_fkey": {
      "childTable": "ops_task",
      "parentKey": "id",
      "childKey": "assigned_to",
      "isArray": true
    },
    "patient_details": {
      "childTable": "patient_details",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details!patient_details_id_fkey": {
      "childTable": "patient_details",
      "parentKey": "id",
      "childKey": "id",
      "isArray": true
    },
    "patient_outcome": {
      "childTable": "patient_outcome",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "patient_outcome!patient_outcome_patient_id_fkey": {
      "childTable": "patient_outcome",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "pharmacist_details": {
      "childTable": "pharmacist_details",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "pharmacist_details!pharmacist_details_id_fkey": {
      "childTable": "pharmacist_details",
      "parentKey": "id",
      "childKey": "id",
      "isArray": true
    },
    "screening_sessions": {
      "childTable": "screening_sessions",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "screening_sessions!screening_sessions_patient_id_fkey": {
      "childTable": "screening_sessions",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "staffs": {
      "childTable": "staffs",
      "parentKey": "id",
      "childKey": "admin_id",
      "isArray": false
    },
    "staffs!staffs_admin_id_fkey": {
      "childTable": "staffs",
      "parentKey": "id",
      "childKey": "admin_id",
      "isArray": true
    },
    "user_badges": {
      "childTable": "user_badges",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "user_badges!user_badges_user_id_fkey": {
      "childTable": "user_badges",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "user_insurance_applications": {
      "childTable": "user_insurance_applications",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "user_insurance_applications!user_insurance_applications_user_id_fkey": {
      "childTable": "user_insurance_applications",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "user_session_state": {
      "childTable": "user_session_state",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "user_session_state!user_session_state_user_id_fkey": {
      "childTable": "user_session_state",
      "parentKey": "id",
      "childKey": "user_id",
      "isArray": true
    },
    "wallet_accounts": {
      "childTable": "wallet_accounts",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "reward_ledgers": {
      "childTable": "reward_ledgers",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    }
  },
  "care_episodes": {
    "activity_log": {
      "childTable": "activity_log",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "activity_log!activity_log_care_episode_id_fkey": {
      "childTable": "activity_log",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "appointments": {
      "childTable": "appointments",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "appointments!appointments_care_episode_id_fkey": {
      "childTable": "appointments",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "care_episode_summary": {
      "childTable": "care_episode_summary",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "care_episode_summary!care_episode_summary_care_episode_id_fkey": {
      "childTable": "care_episode_summary",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "users": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!care_episodes_patient_id_fkey": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "care_followup_commitment": {
      "childTable": "care_followup_commitment",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "care_followup_commitment!care_followup_commitment_care_episode_id_fkey": {
      "childTable": "care_followup_commitment",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "consultations": {
      "childTable": "consultations",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "consultations!consultations_care_episode_id_fkey": {
      "childTable": "consultations",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "financial_transaction_log": {
      "childTable": "financial_transaction_log",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "financial_transaction_log!financial_transaction_log_care_episode_id_fkey": {
      "childTable": "financial_transaction_log",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "funnel_tracking_log": {
      "childTable": "funnel_tracking_log",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "funnel_tracking_log!funnel_tracking_log_care_episode_id_fkey": {
      "childTable": "funnel_tracking_log",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "home_visit_request": {
      "childTable": "home_visit_request",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "home_visit_request!home_visit_request_care_episode_id_fkey": {
      "childTable": "home_visit_request",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "incident": {
      "childTable": "incident",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "incident!incident_care_episode_id_fkey": {
      "childTable": "incident",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "lab_test_orders": {
      "childTable": "lab_test_orders",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "lab_test_orders!lab_test_orders_care_episode_id_fkey": {
      "childTable": "lab_test_orders",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "nursing_leads": {
      "childTable": "nursing_leads",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "nursing_leads!nursing_leads_care_episode_id_fkey": {
      "childTable": "nursing_leads",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "ops_task": {
      "childTable": "ops_task",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "ops_task!ops_task_care_episode_id_fkey": {
      "childTable": "ops_task",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "patient_outcome": {
      "childTable": "patient_outcome",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "patient_outcome!patient_outcome_care_episode_id_fkey": {
      "childTable": "patient_outcome",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "prescription_service_map": {
      "childTable": "prescription_service_map",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "prescription_service_map!prescription_service_map_care_episode_id_fkey": {
      "childTable": "prescription_service_map",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "provider_ranking_event": {
      "childTable": "provider_ranking_event",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "provider_ranking_event!provider_ranking_event_care_episode_id_fkey": {
      "childTable": "provider_ranking_event",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "screening_sessions": {
      "childTable": "screening_sessions",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "screening_sessions!screening_sessions_care_episode_id_fkey": {
      "childTable": "screening_sessions",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "user_session_state": {
      "childTable": "user_session_state",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    },
    "user_session_state!user_session_state_care_episode_id_fkey": {
      "childTable": "user_session_state",
      "parentKey": "id",
      "childKey": "care_episode_id",
      "isArray": true
    }
  },
  "admin_details": {
    "users": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "id": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "id!inner": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "users!admin_details_id_fkey": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "clinical_risk_flags": {
      "childTable": "clinical_risk_flags",
      "parentKey": "id",
      "childKey": "reviewed_by",
      "isArray": true
    },
    "clinical_risk_flags!clinical_risk_flags_reviewed_by_fkey": {
      "childTable": "clinical_risk_flags",
      "parentKey": "id",
      "childKey": "reviewed_by",
      "isArray": true
    }
  },
  "appointments": {
    "care_episodes": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!appointments_care_episode_id_fkey": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "users": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "users!appointments_doctor_id_fkey": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!appointments_patient_id_fkey": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "screening_sessions": {
      "childTable": "screening_sessions",
      "parentKey": "screening_id",
      "childKey": "id",
      "isArray": false
    },
    "screening_sessions!inner": {
      "childTable": "screening_sessions",
      "parentKey": "screening_id",
      "childKey": "id",
      "isArray": false
    },
    "screening_id": {
      "childTable": "screening_sessions",
      "parentKey": "screening_id",
      "childKey": "id",
      "isArray": false
    },
    "screening_id!inner": {
      "childTable": "screening_sessions",
      "parentKey": "screening_id",
      "childKey": "id",
      "isArray": false
    },
    "screening": {
      "childTable": "screening_sessions",
      "parentKey": "screening_id",
      "childKey": "id",
      "isArray": false
    },
    "screening!inner": {
      "childTable": "screening_sessions",
      "parentKey": "screening_id",
      "childKey": "id",
      "isArray": false
    },
    "screening_sessions!appointments_screening_id_fkey": {
      "childTable": "screening_sessions",
      "parentKey": "screening_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations": {
      "childTable": "consultations",
      "parentKey": "id",
      "childKey": "appointment_id",
      "isArray": true
    },
    "consultations!consultations_appointment_id_fkey": {
      "childTable": "consultations",
      "parentKey": "id",
      "childKey": "appointment_id",
      "isArray": true
    },
    "prescriptions": {
      "childTable": "prescriptions",
      "parentKey": "id",
      "childKey": "appointment_id",
      "isArray": true
    },
    "prescriptions!prescriptions_appointment_id_fkey": {
      "childTable": "prescriptions",
      "parentKey": "id",
      "childKey": "appointment_id",
      "isArray": true
    },
    "patient_details": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "screening_sessions": {
    "appointments": {
      "childTable": "appointments",
      "parentKey": "id",
      "childKey": "screening_id",
      "isArray": true
    },
    "appointments!appointments_screening_id_fkey": {
      "childTable": "appointments",
      "parentKey": "id",
      "childKey": "screening_id",
      "isArray": true
    },
    "care_episodes": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!screening_sessions_care_episode_id_fkey": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "users": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!screening_sessions_patient_id_fkey": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "audit_log": {
    "users": {
      "childTable": "users",
      "parentKey": "changed_by",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "changed_by",
      "childKey": "id",
      "isArray": false
    },
    "changed_by": {
      "childTable": "users",
      "parentKey": "changed_by",
      "childKey": "id",
      "isArray": false
    },
    "changed_by!inner": {
      "childTable": "users",
      "parentKey": "changed_by",
      "childKey": "id",
      "isArray": false
    },
    "users!audit_log_changed_by_fkey": {
      "childTable": "users",
      "parentKey": "changed_by",
      "childKey": "id",
      "isArray": false
    }
  },
  "auth_sessions": {
    "users": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!auth_sessions_user_id_fkey": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "bpl_requests": {
    "users": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!bpl_requests_user_id_fkey": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "breathing_sessions": {
    "users": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!breathing_sessions_user_id_fkey": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "care_episode_summary": {
    "care_episodes": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!care_episode_summary_care_episode_id_fkey": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations": {
      "childTable": "consultations",
      "parentKey": "last_consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!inner": {
      "childTable": "consultations",
      "parentKey": "last_consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "last_consultation_id": {
      "childTable": "consultations",
      "parentKey": "last_consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "last_consultation_id!inner": {
      "childTable": "consultations",
      "parentKey": "last_consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "last_consultation": {
      "childTable": "consultations",
      "parentKey": "last_consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "last_consultation!inner": {
      "childTable": "consultations",
      "parentKey": "last_consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!care_episode_summary_last_consultation_id_fkey": {
      "childTable": "consultations",
      "parentKey": "last_consultation_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "consultations": {
    "care_episode_summary": {
      "childTable": "care_episode_summary",
      "parentKey": "id",
      "childKey": "last_consultation_id",
      "isArray": true
    },
    "care_episode_summary!care_episode_summary_last_consultation_id_fkey": {
      "childTable": "care_episode_summary",
      "parentKey": "id",
      "childKey": "last_consultation_id",
      "isArray": true
    },
    "care_followup_commitment": {
      "childTable": "care_followup_commitment",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "care_followup_commitment!care_followup_commitment_consultation_id_fkey": {
      "childTable": "care_followup_commitment",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "consultation_baseline": {
      "childTable": "consultation_baseline",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "consultation_baseline!consultation_baseline_consultation_id_fkey": {
      "childTable": "consultation_baseline",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "consultation_clinical": {
      "childTable": "consultation_clinical",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "consultation_clinical!consultation_clinical_consultation_id_fkey": {
      "childTable": "consultation_clinical",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "consultation_clinical_version": {
      "childTable": "consultation_clinical_version",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "consultation_clinical_version!consultation_clinical_version_consultation_id_fkey": {
      "childTable": "consultation_clinical_version",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "consultation_dropoff": {
      "childTable": "consultation_dropoff",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "consultation_dropoff!consultation_dropoff_consultation_id_fkey": {
      "childTable": "consultation_dropoff",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "consultation_medications": {
      "childTable": "consultation_medications",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "consultation_medications!consultation_medications_consultation_id_fkey": {
      "childTable": "consultation_medications",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "consultation_outcome": {
      "childTable": "consultation_outcome",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "consultation_outcome!consultation_outcome_consultation_id_fkey": {
      "childTable": "consultation_outcome",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "consultation_quality_flag": {
      "childTable": "consultation_quality_flag",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "consultation_quality_flag!consultation_quality_flag_consultation_id_fkey": {
      "childTable": "consultation_quality_flag",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "consultation_symptoms": {
      "childTable": "consultation_symptoms",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "consultation_symptoms!consultation_symptoms_consultation_id_fkey": {
      "childTable": "consultation_symptoms",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "appointments": {
      "childTable": "appointments",
      "parentKey": "appointment_id",
      "childKey": "id",
      "isArray": false
    },
    "appointments!inner": {
      "childTable": "appointments",
      "parentKey": "appointment_id",
      "childKey": "id",
      "isArray": false
    },
    "appointment_id": {
      "childTable": "appointments",
      "parentKey": "appointment_id",
      "childKey": "id",
      "isArray": false
    },
    "appointment_id!inner": {
      "childTable": "appointments",
      "parentKey": "appointment_id",
      "childKey": "id",
      "isArray": false
    },
    "appointment": {
      "childTable": "appointments",
      "parentKey": "appointment_id",
      "childKey": "id",
      "isArray": false
    },
    "appointment!inner": {
      "childTable": "appointments",
      "parentKey": "appointment_id",
      "childKey": "id",
      "isArray": false
    },
    "appointments!consultations_appointment_id_fkey": {
      "childTable": "appointments",
      "parentKey": "appointment_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!consultations_care_episode_id_fkey": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "users": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "users!consultations_doctor_id_fkey": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations": {
      "childTable": "consultations",
      "parentKey": "parent_consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!inner": {
      "childTable": "consultations",
      "parentKey": "parent_consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "parent_consultation_id": {
      "childTable": "consultations",
      "parentKey": "parent_consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "parent_consultation_id!inner": {
      "childTable": "consultations",
      "parentKey": "parent_consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "parent_consultation": {
      "childTable": "consultations",
      "parentKey": "parent_consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "parent_consultation!inner": {
      "childTable": "consultations",
      "parentKey": "parent_consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!consultations_parent_consultation_id_fkey": {
      "childTable": "consultations",
      "parentKey": "parent_consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!consultations_patient_id_fkey": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "specialty": {
      "childTable": "specialty",
      "parentKey": "specialty_id",
      "childKey": "id",
      "isArray": false
    },
    "specialty!inner": {
      "childTable": "specialty",
      "parentKey": "specialty_id",
      "childKey": "id",
      "isArray": false
    },
    "specialty_id": {
      "childTable": "specialty",
      "parentKey": "specialty_id",
      "childKey": "id",
      "isArray": false
    },
    "specialty_id!inner": {
      "childTable": "specialty",
      "parentKey": "specialty_id",
      "childKey": "id",
      "isArray": false
    },
    "specialty!consultations_specialty_id_fkey": {
      "childTable": "specialty",
      "parentKey": "specialty_id",
      "childKey": "id",
      "isArray": false
    },
    "conversion_tracking": {
      "childTable": "conversion_tracking",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "conversion_tracking!conversion_tracking_consultation_id_fkey": {
      "childTable": "conversion_tracking",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "incident": {
      "childTable": "incident",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "incident!incident_consultation_id_fkey": {
      "childTable": "incident",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "offline_queue": {
      "childTable": "offline_queue",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "offline_queue!offline_queue_consultation_id_fkey": {
      "childTable": "offline_queue",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "patient_outcome": {
      "childTable": "patient_outcome",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "patient_outcome!patient_outcome_consultation_id_fkey": {
      "childTable": "patient_outcome",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "prescription_service_map": {
      "childTable": "prescription_service_map",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "prescription_service_map!prescription_service_map_consultation_id_fkey": {
      "childTable": "prescription_service_map",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "provider_ranking_event": {
      "childTable": "provider_ranking_event",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "provider_ranking_event!provider_ranking_event_consultation_id_fkey": {
      "childTable": "provider_ranking_event",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "risk_flags": {
      "childTable": "risk_flags",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "risk_flags!risk_flags_consultation_id_fkey": {
      "childTable": "risk_flags",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "user_session_state": {
      "childTable": "user_session_state",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    },
    "user_session_state!user_session_state_consultation_id_fkey": {
      "childTable": "user_session_state",
      "parentKey": "id",
      "childKey": "consultation_id",
      "isArray": true
    }
  },
  "care_followup_commitment": {
    "care_episodes": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!care_followup_commitment_care_episode_id_fkey": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!care_followup_commitment_consultation_id_fkey": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "chemist_details": {
    "users": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "id": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "id!inner": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "users!chemist_details_id_fkey": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_inventory_batches": {
      "childTable": "chemist_inventory_batches",
      "parentKey": "id",
      "childKey": "chemist_id",
      "isArray": true
    },
    "chemist_inventory_batches!chemist_inventory_batches_chemist_id_fkey": {
      "childTable": "chemist_inventory_batches",
      "parentKey": "id",
      "childKey": "chemist_id",
      "isArray": true
    },
    "chemist_inventory": {
      "childTable": "chemist_inventory",
      "parentKey": "id",
      "childKey": "chemist_id",
      "isArray": true
    },
    "chemist_inventory!chemist_inventory_chemist_id_fkey": {
      "childTable": "chemist_inventory",
      "parentKey": "id",
      "childKey": "chemist_id",
      "isArray": true
    },
    "chemist_medicines": {
      "childTable": "chemist_medicines",
      "parentKey": "id",
      "childKey": "chemist_id",
      "isArray": true
    },
    "chemist_medicines!chemist_medicines_chemist_id_fkey": {
      "childTable": "chemist_medicines",
      "parentKey": "id",
      "childKey": "chemist_id",
      "isArray": true
    },
    "chemist_stock_logs": {
      "childTable": "chemist_stock_logs",
      "parentKey": "id",
      "childKey": "chemist_id",
      "isArray": true
    },
    "chemist_stock_logs!chemist_stock_logs_chemist_id_fkey": {
      "childTable": "chemist_stock_logs",
      "parentKey": "id",
      "childKey": "chemist_id",
      "isArray": true
    },
    "medicine_orders": {
      "childTable": "medicine_orders",
      "parentKey": "id",
      "childKey": "chemist_id",
      "isArray": true
    },
    "medicine_orders!medicine_orders_chemist_id_fkey": {
      "childTable": "medicine_orders",
      "parentKey": "id",
      "childKey": "chemist_id",
      "isArray": true
    },
    "medicine_order_price_history": {
      "childTable": "medicine_order_price_history",
      "parentKey": "id",
      "childKey": "chemist_id",
      "isArray": true
    },
    "medicine_order_price_history!mop_history_chemist_fkey": {
      "childTable": "medicine_order_price_history",
      "parentKey": "id",
      "childKey": "chemist_id",
      "isArray": true
    }
  },
  "chemist_inventory_batches": {
    "chemist_details": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_details!inner": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_id": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_id!inner": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist!inner": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_details!chemist_inventory_batches_chemist_id_fkey": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_medicines": {
      "childTable": "chemist_medicines",
      "parentKey": "medicine_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_medicines!inner": {
      "childTable": "chemist_medicines",
      "parentKey": "medicine_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine_id": {
      "childTable": "chemist_medicines",
      "parentKey": "medicine_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine_id!inner": {
      "childTable": "chemist_medicines",
      "parentKey": "medicine_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine": {
      "childTable": "chemist_medicines",
      "parentKey": "medicine_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine!inner": {
      "childTable": "chemist_medicines",
      "parentKey": "medicine_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_medicines!chemist_inventory_batches_medicine_id_fkey": {
      "childTable": "chemist_medicines",
      "parentKey": "medicine_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_stock_logs": {
      "childTable": "chemist_stock_logs",
      "parentKey": "id",
      "childKey": "batch_id",
      "isArray": true
    },
    "chemist_stock_logs!chemist_stock_logs_batch_id_fkey": {
      "childTable": "chemist_stock_logs",
      "parentKey": "id",
      "childKey": "batch_id",
      "isArray": true
    }
  },
  "chemist_medicines": {
    "chemist_inventory_batches": {
      "childTable": "chemist_inventory_batches",
      "parentKey": "id",
      "childKey": "medicine_id",
      "isArray": true
    },
    "chemist_inventory_batches!chemist_inventory_batches_medicine_id_fkey": {
      "childTable": "chemist_inventory_batches",
      "parentKey": "id",
      "childKey": "medicine_id",
      "isArray": true
    },
    "chemist_inventory": {
      "childTable": "chemist_inventory",
      "parentKey": "id",
      "childKey": "medicine_id",
      "isArray": true
    },
    "chemist_inventory!chemist_inventory_medicine_id_fkey": {
      "childTable": "chemist_inventory",
      "parentKey": "id",
      "childKey": "medicine_id",
      "isArray": true
    },
    "chemist_details": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_details!inner": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_id": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_id!inner": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist!inner": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_details!chemist_medicines_chemist_id_fkey": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_stock_logs": {
      "childTable": "chemist_stock_logs",
      "parentKey": "id",
      "childKey": "medicine_id",
      "isArray": true
    },
    "chemist_stock_logs!chemist_stock_logs_medicine_id_fkey": {
      "childTable": "chemist_stock_logs",
      "parentKey": "id",
      "childKey": "medicine_id",
      "isArray": true
    }
  },
  "chemist_inventory": {
    "chemist_details": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_details!inner": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_id": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_id!inner": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist!inner": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_details!chemist_inventory_chemist_id_fkey": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_medicines": {
      "childTable": "chemist_medicines",
      "parentKey": "medicine_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_medicines!inner": {
      "childTable": "chemist_medicines",
      "parentKey": "medicine_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine_id": {
      "childTable": "chemist_medicines",
      "parentKey": "medicine_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine_id!inner": {
      "childTable": "chemist_medicines",
      "parentKey": "medicine_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine": {
      "childTable": "chemist_medicines",
      "parentKey": "medicine_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine!inner": {
      "childTable": "chemist_medicines",
      "parentKey": "medicine_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_medicines!chemist_inventory_medicine_id_fkey": {
      "childTable": "chemist_medicines",
      "parentKey": "medicine_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "chemist_stock_logs": {
    "chemist_inventory_batches": {
      "childTable": "chemist_inventory_batches",
      "parentKey": "batch_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_inventory_batches!inner": {
      "childTable": "chemist_inventory_batches",
      "parentKey": "batch_id",
      "childKey": "id",
      "isArray": false
    },
    "batch_id": {
      "childTable": "chemist_inventory_batches",
      "parentKey": "batch_id",
      "childKey": "id",
      "isArray": false
    },
    "batch_id!inner": {
      "childTable": "chemist_inventory_batches",
      "parentKey": "batch_id",
      "childKey": "id",
      "isArray": false
    },
    "batch": {
      "childTable": "chemist_inventory_batches",
      "parentKey": "batch_id",
      "childKey": "id",
      "isArray": false
    },
    "batch!inner": {
      "childTable": "chemist_inventory_batches",
      "parentKey": "batch_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_inventory_batches!chemist_stock_logs_batch_id_fkey": {
      "childTable": "chemist_inventory_batches",
      "parentKey": "batch_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_details": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_details!inner": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_id": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_id!inner": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist!inner": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_details!chemist_stock_logs_chemist_id_fkey": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_medicines": {
      "childTable": "chemist_medicines",
      "parentKey": "medicine_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_medicines!inner": {
      "childTable": "chemist_medicines",
      "parentKey": "medicine_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine_id": {
      "childTable": "chemist_medicines",
      "parentKey": "medicine_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine_id!inner": {
      "childTable": "chemist_medicines",
      "parentKey": "medicine_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine": {
      "childTable": "chemist_medicines",
      "parentKey": "medicine_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine!inner": {
      "childTable": "chemist_medicines",
      "parentKey": "medicine_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_medicines!chemist_stock_logs_medicine_id_fkey": {
      "childTable": "chemist_medicines",
      "parentKey": "medicine_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "clinical_risk_flags": {
    "admin_details": {
      "childTable": "admin_details",
      "parentKey": "reviewed_by",
      "childKey": "id",
      "isArray": false
    },
    "admin_details!inner": {
      "childTable": "admin_details",
      "parentKey": "reviewed_by",
      "childKey": "id",
      "isArray": false
    },
    "reviewed_by": {
      "childTable": "admin_details",
      "parentKey": "reviewed_by",
      "childKey": "id",
      "isArray": false
    },
    "reviewed_by!inner": {
      "childTable": "admin_details",
      "parentKey": "reviewed_by",
      "childKey": "id",
      "isArray": false
    },
    "admin_details!clinical_risk_flags_reviewed_by_fkey": {
      "childTable": "admin_details",
      "parentKey": "reviewed_by",
      "childKey": "id",
      "isArray": false
    }
  },
  "consent_logs": {
    "patient_details": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details!consent_logs_patient_id_fkey": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "document_shares": {
      "childTable": "document_shares",
      "parentKey": "id",
      "childKey": "consent_log_id",
      "isArray": true
    },
    "document_shares!document_shares_consent_log_id_fkey": {
      "childTable": "document_shares",
      "parentKey": "id",
      "childKey": "consent_log_id",
      "isArray": true
    }
  },
  "patient_details": {
    "consent_logs": {
      "childTable": "consent_logs",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "consent_logs!consent_logs_patient_id_fkey": {
      "childTable": "consent_logs",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "consultation_outcome": {
      "childTable": "consultation_outcome",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "consultation_outcome!consultation_outcome_patient_id_fkey": {
      "childTable": "consultation_outcome",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "data_access_log": {
      "childTable": "data_access_log",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "data_access_log!data_access_log_patient_id_fkey": {
      "childTable": "data_access_log",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "document_shares": {
      "childTable": "document_shares",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "document_shares!document_shares_patient_id_fkey": {
      "childTable": "document_shares",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "funnel_tracking_log": {
      "childTable": "funnel_tracking_log",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "funnel_tracking_log!funnel_tracking_log_patient_id_fkey": {
      "childTable": "funnel_tracking_log",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "home_visit_request": {
      "childTable": "home_visit_request",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "home_visit_request!home_visit_request_patient_id_fkey": {
      "childTable": "home_visit_request",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "offline_queue": {
      "childTable": "offline_queue",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "offline_queue!offline_queue_patient_id_fkey": {
      "childTable": "offline_queue",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "patient_consent_log": {
      "childTable": "patient_consent_log",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "patient_consent_log!patient_consent_log_patient_id_fkey": {
      "childTable": "patient_consent_log",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "users": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "id": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "id!inner": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "users!patient_details_id_fkey": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "prescriptions": {
      "childTable": "prescriptions",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    },
    "prescriptions!prescriptions_patient_id_fkey": {
      "childTable": "prescriptions",
      "parentKey": "id",
      "childKey": "patient_id",
      "isArray": true
    }
  },
  "consultation_baseline": {
    "consultations": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!consultation_baseline_consultation_id_fkey": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "consultation_clinical": {
    "consultations": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!consultation_clinical_consultation_id_fkey": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!consultation_clinical_doctor_id_fkey": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "doctor_details": {
    "consultation_clinical": {
      "childTable": "consultation_clinical",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "consultation_clinical!consultation_clinical_doctor_id_fkey": {
      "childTable": "consultation_clinical",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "consultation_clinical_version": {
      "childTable": "consultation_clinical_version",
      "parentKey": "id",
      "childKey": "created_by",
      "isArray": true
    },
    "consultation_clinical_version!consultation_clinical_version_created_by_fkey": {
      "childTable": "consultation_clinical_version",
      "parentKey": "id",
      "childKey": "created_by",
      "isArray": true
    },
    "data_access_log": {
      "childTable": "data_access_log",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "data_access_log!data_access_log_doctor_id_fkey": {
      "childTable": "data_access_log",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "doctor_agreement_log": {
      "childTable": "doctor_agreement_log",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "doctor_agreement_log!doctor_agreement_log_doctor_id_fkey": {
      "childTable": "doctor_agreement_log",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "doctor_behavior_metrics": {
      "childTable": "doctor_behavior_metrics",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "doctor_behavior_metrics!doctor_behavior_metrics_doctor_id_fkey": {
      "childTable": "doctor_behavior_metrics",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "users": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "id": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "id!inner": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "users!doctor_details_id_fkey": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_favorites": {
      "childTable": "doctor_favorites",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "doctor_favorites!doctor_favorites_doctor_id_fkey": {
      "childTable": "doctor_favorites",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "doctor_preferences": {
      "childTable": "doctor_preferences",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "doctor_preferences!doctor_preferences_doctor_id_fkey": {
      "childTable": "doctor_preferences",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "prescription_templates": {
      "childTable": "prescription_templates",
      "parentKey": "id",
      "childKey": "created_by",
      "isArray": true
    },
    "prescription_templates!prescription_templates_created_by_fkey": {
      "childTable": "prescription_templates",
      "parentKey": "id",
      "childKey": "created_by",
      "isArray": true
    },
    "prescription_validation_log": {
      "childTable": "prescription_validation_log",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "prescription_validation_log!prescription_validation_log_doctor_id_fkey": {
      "childTable": "prescription_validation_log",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "prescriptions": {
      "childTable": "prescriptions",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "prescriptions!prescriptions_doctor_id_fkey": {
      "childTable": "prescriptions",
      "parentKey": "id",
      "childKey": "doctor_id",
      "isArray": true
    },
    "prescriptions!prescriptions_signed_by_fkey": {
      "childTable": "prescriptions",
      "parentKey": "id",
      "childKey": "signed_by",
      "isArray": true
    }
  },
  "consultation_clinical_version": {
    "consultations": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!consultation_clinical_version_consultation_id_fkey": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details": {
      "childTable": "doctor_details",
      "parentKey": "created_by",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!inner": {
      "childTable": "doctor_details",
      "parentKey": "created_by",
      "childKey": "id",
      "isArray": false
    },
    "created_by": {
      "childTable": "doctor_details",
      "parentKey": "created_by",
      "childKey": "id",
      "isArray": false
    },
    "created_by!inner": {
      "childTable": "doctor_details",
      "parentKey": "created_by",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!consultation_clinical_version_created_by_fkey": {
      "childTable": "doctor_details",
      "parentKey": "created_by",
      "childKey": "id",
      "isArray": false
    }
  },
  "consultation_dropoff": {
    "consultations": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!consultation_dropoff_consultation_id_fkey": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "consultation_medications": {
    "consultations": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!consultation_medications_consultation_id_fkey": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "consultation_outcome": {
    "consultations": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!consultation_outcome_consultation_id_fkey": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details!consultation_outcome_patient_id_fkey": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "consultation_quality_flag": {
    "consultations": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!consultation_quality_flag_consultation_id_fkey": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "consultation_symptoms": {
    "consultations": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!consultation_symptoms_consultation_id_fkey": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "specialty": {
    "consultations": {
      "childTable": "consultations",
      "parentKey": "id",
      "childKey": "specialty_id",
      "isArray": true
    },
    "consultations!consultations_specialty_id_fkey": {
      "childTable": "consultations",
      "parentKey": "id",
      "childKey": "specialty_id",
      "isArray": true
    },
    "custom_diagnosis_review": {
      "childTable": "custom_diagnosis_review",
      "parentKey": "id",
      "childKey": "specialty_id",
      "isArray": true
    },
    "custom_diagnosis_review!custom_diagnosis_review_specialty_id_fkey": {
      "childTable": "custom_diagnosis_review",
      "parentKey": "id",
      "childKey": "specialty_id",
      "isArray": true
    },
    "diagnosis_master": {
      "childTable": "diagnosis_master",
      "parentKey": "id",
      "childKey": "specialty_id",
      "isArray": true
    },
    "diagnosis_master!diagnosis_master_specialty_id_fkey": {
      "childTable": "diagnosis_master",
      "parentKey": "id",
      "childKey": "specialty_id",
      "isArray": true
    },
    "drug_specialty_map": {
      "childTable": "drug_specialty_map",
      "parentKey": "id",
      "childKey": "allowed_specialty_id",
      "isArray": true
    },
    "drug_specialty_map!drug_specialty_map_allowed_specialty_id_fkey": {
      "childTable": "drug_specialty_map",
      "parentKey": "id",
      "childKey": "allowed_specialty_id",
      "isArray": true
    }
  },
  "conversion_tracking": {
    "consultations": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!conversion_tracking_consultation_id_fkey": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "custom_diagnosis_review": {
    "diagnosis_master": {
      "childTable": "diagnosis_master",
      "parentKey": "promoted_to_master_id",
      "childKey": "id",
      "isArray": false
    },
    "diagnosis_master!inner": {
      "childTable": "diagnosis_master",
      "parentKey": "promoted_to_master_id",
      "childKey": "id",
      "isArray": false
    },
    "promoted_to_master_id": {
      "childTable": "diagnosis_master",
      "parentKey": "promoted_to_master_id",
      "childKey": "id",
      "isArray": false
    },
    "promoted_to_master_id!inner": {
      "childTable": "diagnosis_master",
      "parentKey": "promoted_to_master_id",
      "childKey": "id",
      "isArray": false
    },
    "promoted_to_master": {
      "childTable": "diagnosis_master",
      "parentKey": "promoted_to_master_id",
      "childKey": "id",
      "isArray": false
    },
    "promoted_to_master!inner": {
      "childTable": "diagnosis_master",
      "parentKey": "promoted_to_master_id",
      "childKey": "id",
      "isArray": false
    },
    "diagnosis_master!custom_diagnosis_review_promoted_to_master_id_fkey": {
      "childTable": "diagnosis_master",
      "parentKey": "promoted_to_master_id",
      "childKey": "id",
      "isArray": false
    },
    "users": {
      "childTable": "users",
      "parentKey": "reviewed_by",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "reviewed_by",
      "childKey": "id",
      "isArray": false
    },
    "reviewed_by": {
      "childTable": "users",
      "parentKey": "reviewed_by",
      "childKey": "id",
      "isArray": false
    },
    "reviewed_by!inner": {
      "childTable": "users",
      "parentKey": "reviewed_by",
      "childKey": "id",
      "isArray": false
    },
    "users!custom_diagnosis_review_reviewed_by_fkey": {
      "childTable": "users",
      "parentKey": "reviewed_by",
      "childKey": "id",
      "isArray": false
    },
    "specialty": {
      "childTable": "specialty",
      "parentKey": "specialty_id",
      "childKey": "id",
      "isArray": false
    },
    "specialty!inner": {
      "childTable": "specialty",
      "parentKey": "specialty_id",
      "childKey": "id",
      "isArray": false
    },
    "specialty_id": {
      "childTable": "specialty",
      "parentKey": "specialty_id",
      "childKey": "id",
      "isArray": false
    },
    "specialty_id!inner": {
      "childTable": "specialty",
      "parentKey": "specialty_id",
      "childKey": "id",
      "isArray": false
    },
    "specialty!custom_diagnosis_review_specialty_id_fkey": {
      "childTable": "specialty",
      "parentKey": "specialty_id",
      "childKey": "id",
      "isArray": false
    },
    "submitted_by": {
      "childTable": "users",
      "parentKey": "submitted_by",
      "childKey": "id",
      "isArray": false
    },
    "submitted_by!inner": {
      "childTable": "users",
      "parentKey": "submitted_by",
      "childKey": "id",
      "isArray": false
    },
    "users!custom_diagnosis_review_submitted_by_fkey": {
      "childTable": "users",
      "parentKey": "submitted_by",
      "childKey": "id",
      "isArray": false
    }
  },
  "diagnosis_master": {
    "custom_diagnosis_review": {
      "childTable": "custom_diagnosis_review",
      "parentKey": "id",
      "childKey": "promoted_to_master_id",
      "isArray": true
    },
    "custom_diagnosis_review!custom_diagnosis_review_promoted_to_master_id_fkey": {
      "childTable": "custom_diagnosis_review",
      "parentKey": "id",
      "childKey": "promoted_to_master_id",
      "isArray": true
    },
    "specialty": {
      "childTable": "specialty",
      "parentKey": "specialty_id",
      "childKey": "id",
      "isArray": false
    },
    "specialty!inner": {
      "childTable": "specialty",
      "parentKey": "specialty_id",
      "childKey": "id",
      "isArray": false
    },
    "specialty_id": {
      "childTable": "specialty",
      "parentKey": "specialty_id",
      "childKey": "id",
      "isArray": false
    },
    "specialty_id!inner": {
      "childTable": "specialty",
      "parentKey": "specialty_id",
      "childKey": "id",
      "isArray": false
    },
    "specialty!diagnosis_master_specialty_id_fkey": {
      "childTable": "specialty",
      "parentKey": "specialty_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "data_access_log": {
    "doctor_details": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!data_access_log_doctor_id_fkey": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details!data_access_log_patient_id_fkey": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "digital_locker_audit_logs": {
    "digital_locker_documents": {
      "childTable": "digital_locker_documents",
      "parentKey": "document_id",
      "childKey": "id",
      "isArray": false
    },
    "digital_locker_documents!inner": {
      "childTable": "digital_locker_documents",
      "parentKey": "document_id",
      "childKey": "id",
      "isArray": false
    },
    "document_id": {
      "childTable": "digital_locker_documents",
      "parentKey": "document_id",
      "childKey": "id",
      "isArray": false
    },
    "document_id!inner": {
      "childTable": "digital_locker_documents",
      "parentKey": "document_id",
      "childKey": "id",
      "isArray": false
    },
    "document": {
      "childTable": "digital_locker_documents",
      "parentKey": "document_id",
      "childKey": "id",
      "isArray": false
    },
    "document!inner": {
      "childTable": "digital_locker_documents",
      "parentKey": "document_id",
      "childKey": "id",
      "isArray": false
    },
    "digital_locker_documents!digital_locker_audit_logs_document_id_fkey": {
      "childTable": "digital_locker_documents",
      "parentKey": "document_id",
      "childKey": "id",
      "isArray": false
    },
    "users": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!digital_locker_audit_logs_user_id_fkey": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "digital_locker_documents": {
    "digital_locker_audit_logs": {
      "childTable": "digital_locker_audit_logs",
      "parentKey": "id",
      "childKey": "document_id",
      "isArray": true
    },
    "digital_locker_audit_logs!digital_locker_audit_logs_document_id_fkey": {
      "childTable": "digital_locker_audit_logs",
      "parentKey": "id",
      "childKey": "document_id",
      "isArray": true
    },
    "users": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!digital_locker_documents_user_id_fkey": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "document_verification_requests": {
      "childTable": "document_verification_requests",
      "parentKey": "id",
      "childKey": "document_id",
      "isArray": true
    },
    "document_verification_requests!document_verification_requests_document_id_fkey": {
      "childTable": "document_verification_requests",
      "parentKey": "id",
      "childKey": "document_id",
      "isArray": true
    }
  },
  "doctor_agreement_log": {
    "doctor_details": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!doctor_agreement_log_doctor_id_fkey": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "doctor_behavior_metrics": {
    "doctor_details": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!doctor_behavior_metrics_doctor_id_fkey": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "doctor_consents": {
    "users": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "users!doctor_consents_doctor_id_fkey": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "doctor_favorites": {
    "doctor_details": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!doctor_favorites_doctor_id_fkey": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "doctor_onboarding_status": {
    "users": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "users!doctor_onboarding_status_doctor_id_fkey": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "doctor_otp_logs": {
    "users": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "users!doctor_otp_logs_doctor_id_fkey": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "doctor_preferences": {
    "doctor_details": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!doctor_preferences_doctor_id_fkey": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "doctor_session_agreement": {
    "users": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "users!doctor_session_agreement_doctor_id_fkey": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "doctor_verification_logs": {
    "users": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "users!doctor_verification_logs_doctor_id_fkey": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "verified_by": {
      "childTable": "users",
      "parentKey": "verified_by",
      "childKey": "id",
      "isArray": false
    },
    "verified_by!inner": {
      "childTable": "users",
      "parentKey": "verified_by",
      "childKey": "id",
      "isArray": false
    },
    "users!doctor_verification_logs_verified_by_fkey": {
      "childTable": "users",
      "parentKey": "verified_by",
      "childKey": "id",
      "isArray": false
    }
  },
  "document_shares": {
    "consent_logs": {
      "childTable": "consent_logs",
      "parentKey": "consent_log_id",
      "childKey": "id",
      "isArray": false
    },
    "consent_logs!inner": {
      "childTable": "consent_logs",
      "parentKey": "consent_log_id",
      "childKey": "id",
      "isArray": false
    },
    "consent_log_id": {
      "childTable": "consent_logs",
      "parentKey": "consent_log_id",
      "childKey": "id",
      "isArray": false
    },
    "consent_log_id!inner": {
      "childTable": "consent_logs",
      "parentKey": "consent_log_id",
      "childKey": "id",
      "isArray": false
    },
    "consent_log": {
      "childTable": "consent_logs",
      "parentKey": "consent_log_id",
      "childKey": "id",
      "isArray": false
    },
    "consent_log!inner": {
      "childTable": "consent_logs",
      "parentKey": "consent_log_id",
      "childKey": "id",
      "isArray": false
    },
    "consent_logs!document_shares_consent_log_id_fkey": {
      "childTable": "consent_logs",
      "parentKey": "consent_log_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details!document_shares_patient_id_fkey": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "document_verification_requests": {
    "digital_locker_documents": {
      "childTable": "digital_locker_documents",
      "parentKey": "document_id",
      "childKey": "id",
      "isArray": false
    },
    "digital_locker_documents!inner": {
      "childTable": "digital_locker_documents",
      "parentKey": "document_id",
      "childKey": "id",
      "isArray": false
    },
    "document_id": {
      "childTable": "digital_locker_documents",
      "parentKey": "document_id",
      "childKey": "id",
      "isArray": false
    },
    "document_id!inner": {
      "childTable": "digital_locker_documents",
      "parentKey": "document_id",
      "childKey": "id",
      "isArray": false
    },
    "document": {
      "childTable": "digital_locker_documents",
      "parentKey": "document_id",
      "childKey": "id",
      "isArray": false
    },
    "document!inner": {
      "childTable": "digital_locker_documents",
      "parentKey": "document_id",
      "childKey": "id",
      "isArray": false
    },
    "digital_locker_documents!document_verification_requests_document_id_fkey": {
      "childTable": "digital_locker_documents",
      "parentKey": "document_id",
      "childKey": "id",
      "isArray": false
    },
    "users": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!document_verification_requests_user_id_fkey": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "drug_specialty_map": {
    "specialty": {
      "childTable": "specialty",
      "parentKey": "allowed_specialty_id",
      "childKey": "id",
      "isArray": false
    },
    "specialty!inner": {
      "childTable": "specialty",
      "parentKey": "allowed_specialty_id",
      "childKey": "id",
      "isArray": false
    },
    "allowed_specialty_id": {
      "childTable": "specialty",
      "parentKey": "allowed_specialty_id",
      "childKey": "id",
      "isArray": false
    },
    "allowed_specialty_id!inner": {
      "childTable": "specialty",
      "parentKey": "allowed_specialty_id",
      "childKey": "id",
      "isArray": false
    },
    "allowed_specialty": {
      "childTable": "specialty",
      "parentKey": "allowed_specialty_id",
      "childKey": "id",
      "isArray": false
    },
    "allowed_specialty!inner": {
      "childTable": "specialty",
      "parentKey": "allowed_specialty_id",
      "childKey": "id",
      "isArray": false
    },
    "specialty!drug_specialty_map_allowed_specialty_id_fkey": {
      "childTable": "specialty",
      "parentKey": "allowed_specialty_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "email_verifications": {
    "users": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!email_verifications_user_id_fkey": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "financial_transaction_log": {
    "care_episodes": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!financial_transaction_log_care_episode_id_fkey": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "users": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!financial_transaction_log_patient_id_fkey": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "funnel_tracking_log": {
    "care_episodes": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!funnel_tracking_log_care_episode_id_fkey": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details!funnel_tracking_log_patient_id_fkey": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "health_assessments": {
    "users": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!health_assessments_user_id_fkey": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "heart_health_inputs": {
      "childTable": "heart_health_inputs",
      "parentKey": "id",
      "childKey": "assessment_id",
      "isArray": true
    },
    "heart_health_inputs!heart_health_inputs_assessment_id_fkey": {
      "childTable": "heart_health_inputs",
      "parentKey": "id",
      "childKey": "assessment_id",
      "isArray": true
    },
    "lung_health_inputs": {
      "childTable": "lung_health_inputs",
      "parentKey": "id",
      "childKey": "assessment_id",
      "isArray": true
    },
    "lung_health_inputs!lung_health_inputs_assessment_id_fkey": {
      "childTable": "lung_health_inputs",
      "parentKey": "id",
      "childKey": "assessment_id",
      "isArray": true
    }
  },
  "health_challenges": {
    "users": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!health_challenges_user_id_fkey": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "health_insurance_policies": {
    "health_insurance_providers": {
      "childTable": "health_insurance_providers",
      "parentKey": "provider_id",
      "childKey": "id",
      "isArray": false
    },
    "health_insurance_providers!inner": {
      "childTable": "health_insurance_providers",
      "parentKey": "provider_id",
      "childKey": "id",
      "isArray": false
    },
    "provider_id": {
      "childTable": "health_insurance_providers",
      "parentKey": "provider_id",
      "childKey": "id",
      "isArray": false
    },
    "provider_id!inner": {
      "childTable": "health_insurance_providers",
      "parentKey": "provider_id",
      "childKey": "id",
      "isArray": false
    },
    "provider": {
      "childTable": "health_insurance_providers",
      "parentKey": "provider_id",
      "childKey": "id",
      "isArray": false
    },
    "provider!inner": {
      "childTable": "health_insurance_providers",
      "parentKey": "provider_id",
      "childKey": "id",
      "isArray": false
    },
    "health_insurance_providers!health_insurance_policies_provider_id_fkey": {
      "childTable": "health_insurance_providers",
      "parentKey": "provider_id",
      "childKey": "id",
      "isArray": false
    },
    "policy_features": {
      "childTable": "policy_features",
      "parentKey": "id",
      "childKey": "policy_id",
      "isArray": true
    },
    "policy_features!policy_features_policy_id_fkey": {
      "childTable": "policy_features",
      "parentKey": "id",
      "childKey": "policy_id",
      "isArray": true
    },
    "user_insurance_applications": {
      "childTable": "user_insurance_applications",
      "parentKey": "id",
      "childKey": "policy_id",
      "isArray": true
    },
    "user_insurance_applications!user_insurance_applications_policy_id_fkey": {
      "childTable": "user_insurance_applications",
      "parentKey": "id",
      "childKey": "policy_id",
      "isArray": true
    }
  },
  "health_insurance_providers": {
    "health_insurance_policies": {
      "childTable": "health_insurance_policies",
      "parentKey": "id",
      "childKey": "provider_id",
      "isArray": true
    },
    "health_insurance_policies!health_insurance_policies_provider_id_fkey": {
      "childTable": "health_insurance_policies",
      "parentKey": "id",
      "childKey": "provider_id",
      "isArray": true
    }
  },
  "heart_health_inputs": {
    "health_assessments": {
      "childTable": "health_assessments",
      "parentKey": "assessment_id",
      "childKey": "id",
      "isArray": false
    },
    "health_assessments!inner": {
      "childTable": "health_assessments",
      "parentKey": "assessment_id",
      "childKey": "id",
      "isArray": false
    },
    "assessment_id": {
      "childTable": "health_assessments",
      "parentKey": "assessment_id",
      "childKey": "id",
      "isArray": false
    },
    "assessment_id!inner": {
      "childTable": "health_assessments",
      "parentKey": "assessment_id",
      "childKey": "id",
      "isArray": false
    },
    "assessment": {
      "childTable": "health_assessments",
      "parentKey": "assessment_id",
      "childKey": "id",
      "isArray": false
    },
    "assessment!inner": {
      "childTable": "health_assessments",
      "parentKey": "assessment_id",
      "childKey": "id",
      "isArray": false
    },
    "health_assessments!heart_health_inputs_assessment_id_fkey": {
      "childTable": "health_assessments",
      "parentKey": "assessment_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "home_visit_request": {
    "care_episodes": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!home_visit_request_care_episode_id_fkey": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "users": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor!inner": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "users!home_visit_request_doctor_id_fkey": {
      "childTable": "users",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details!home_visit_request_patient_id_fkey": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "hospital_details": {
    "users": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "id": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "id!inner": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "users!hospital_details_user_id_fkey": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    }
  },
  "incident": {
    "care_episodes": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!incident_care_episode_id_fkey": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!incident_consultation_id_fkey": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "users": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!incident_patient_id_fkey": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "resolved_by": {
      "childTable": "users",
      "parentKey": "resolved_by",
      "childKey": "id",
      "isArray": false
    },
    "resolved_by!inner": {
      "childTable": "users",
      "parentKey": "resolved_by",
      "childKey": "id",
      "isArray": false
    },
    "users!incident_resolved_by_fkey": {
      "childTable": "users",
      "parentKey": "resolved_by",
      "childKey": "id",
      "isArray": false
    },
    "ops_task": {
      "childTable": "ops_task",
      "parentKey": "id",
      "childKey": "incident_id",
      "isArray": true
    },
    "ops_task!ops_task_incident_id_fkey": {
      "childTable": "ops_task",
      "parentKey": "id",
      "childKey": "incident_id",
      "isArray": true
    }
  },
  "insurance_claims": {
    "user_insurance_applications": {
      "childTable": "user_insurance_applications",
      "parentKey": "application_id",
      "childKey": "id",
      "isArray": false
    },
    "user_insurance_applications!inner": {
      "childTable": "user_insurance_applications",
      "parentKey": "application_id",
      "childKey": "id",
      "isArray": false
    },
    "application_id": {
      "childTable": "user_insurance_applications",
      "parentKey": "application_id",
      "childKey": "id",
      "isArray": false
    },
    "application_id!inner": {
      "childTable": "user_insurance_applications",
      "parentKey": "application_id",
      "childKey": "id",
      "isArray": false
    },
    "application": {
      "childTable": "user_insurance_applications",
      "parentKey": "application_id",
      "childKey": "id",
      "isArray": false
    },
    "application!inner": {
      "childTable": "user_insurance_applications",
      "parentKey": "application_id",
      "childKey": "id",
      "isArray": false
    },
    "user_insurance_applications!insurance_claims_application_id_fkey": {
      "childTable": "user_insurance_applications",
      "parentKey": "application_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "user_insurance_applications": {
    "insurance_claims": {
      "childTable": "insurance_claims",
      "parentKey": "id",
      "childKey": "application_id",
      "isArray": true
    },
    "insurance_claims!insurance_claims_application_id_fkey": {
      "childTable": "insurance_claims",
      "parentKey": "id",
      "childKey": "application_id",
      "isArray": true
    },
    "health_insurance_policies": {
      "childTable": "health_insurance_policies",
      "parentKey": "policy_id",
      "childKey": "id",
      "isArray": false
    },
    "health_insurance_policies!inner": {
      "childTable": "health_insurance_policies",
      "parentKey": "policy_id",
      "childKey": "id",
      "isArray": false
    },
    "policy_id": {
      "childTable": "health_insurance_policies",
      "parentKey": "policy_id",
      "childKey": "id",
      "isArray": false
    },
    "policy_id!inner": {
      "childTable": "health_insurance_policies",
      "parentKey": "policy_id",
      "childKey": "id",
      "isArray": false
    },
    "policy": {
      "childTable": "health_insurance_policies",
      "parentKey": "policy_id",
      "childKey": "id",
      "isArray": false
    },
    "policy!inner": {
      "childTable": "health_insurance_policies",
      "parentKey": "policy_id",
      "childKey": "id",
      "isArray": false
    },
    "health_insurance_policies!user_insurance_applications_policy_id_fkey": {
      "childTable": "health_insurance_policies",
      "parentKey": "policy_id",
      "childKey": "id",
      "isArray": false
    },
    "users": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!user_insurance_applications_user_id_fkey": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "lab_activity_logs": {
    "users": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_id": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_id!inner": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab!inner": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "users!lab_activity_logs_lab_id_fkey": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "lab_details": {
    "users": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "id": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "id!inner": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "users!lab_details_id_fkey": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "lab_test_orders": {
      "childTable": "lab_test_orders",
      "parentKey": "id",
      "childKey": "lab_id",
      "isArray": true
    },
    "lab_test_orders!lab_test_orders_lab_id_fkey": {
      "childTable": "lab_test_orders",
      "parentKey": "id",
      "childKey": "lab_id",
      "isArray": true
    }
  },
  "lab_order_consents": {
    "users": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_id": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_id!inner": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab!inner": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "users!lab_order_consents_lab_id_fkey": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_test_orders": {
      "childTable": "lab_test_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_test_orders!inner": {
      "childTable": "lab_test_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order_id": {
      "childTable": "lab_test_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order_id!inner": {
      "childTable": "lab_test_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order": {
      "childTable": "lab_test_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order!inner": {
      "childTable": "lab_test_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_test_orders!lab_order_consents_order_id_fkey": {
      "childTable": "lab_test_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!lab_order_consents_patient_id_fkey": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "lab_test_orders": {
    "lab_order_consents": {
      "childTable": "lab_order_consents",
      "parentKey": "id",
      "childKey": "order_id",
      "isArray": true
    },
    "lab_order_consents!lab_order_consents_order_id_fkey": {
      "childTable": "lab_order_consents",
      "parentKey": "id",
      "childKey": "order_id",
      "isArray": true
    },
    "lab_payment_logs": {
      "childTable": "lab_payment_logs",
      "parentKey": "id",
      "childKey": "order_id",
      "isArray": true
    },
    "lab_payment_logs!lab_payment_logs_order_id_fkey": {
      "childTable": "lab_payment_logs",
      "parentKey": "id",
      "childKey": "order_id",
      "isArray": true
    },
    "lab_test_order_items": {
      "childTable": "lab_test_order_items",
      "parentKey": "id",
      "childKey": "order_id",
      "isArray": true
    },
    "lab_test_order_items!lab_test_order_items_order_id_fkey": {
      "childTable": "lab_test_order_items",
      "parentKey": "id",
      "childKey": "order_id",
      "isArray": true
    },
    "care_episodes": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!lab_test_orders_care_episode_id_fkey": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_details": {
      "childTable": "lab_details",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_details!inner": {
      "childTable": "lab_details",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_id": {
      "childTable": "lab_details",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_id!inner": {
      "childTable": "lab_details",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab": {
      "childTable": "lab_details",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab!inner": {
      "childTable": "lab_details",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_details!lab_test_orders_lab_id_fkey": {
      "childTable": "lab_details",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "users": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!lab_test_orders_patient_id_fkey": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "prescriptions": {
      "childTable": "prescriptions",
      "parentKey": "prescription_id",
      "childKey": "id",
      "isArray": false
    },
    "prescriptions!inner": {
      "childTable": "prescriptions",
      "parentKey": "prescription_id",
      "childKey": "id",
      "isArray": false
    },
    "prescription_id": {
      "childTable": "prescriptions",
      "parentKey": "prescription_id",
      "childKey": "id",
      "isArray": false
    },
    "prescription_id!inner": {
      "childTable": "prescriptions",
      "parentKey": "prescription_id",
      "childKey": "id",
      "isArray": false
    },
    "prescription": {
      "childTable": "prescriptions",
      "parentKey": "prescription_id",
      "childKey": "id",
      "isArray": false
    },
    "prescription!inner": {
      "childTable": "prescriptions",
      "parentKey": "prescription_id",
      "childKey": "id",
      "isArray": false
    },
    "prescriptions!lab_test_orders_prescription_id_fkey": {
      "childTable": "prescriptions",
      "parentKey": "prescription_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "lab_payment_logs": {
    "users": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_id": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_id!inner": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab!inner": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "users!lab_payment_logs_lab_id_fkey": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_test_orders": {
      "childTable": "lab_test_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_test_orders!inner": {
      "childTable": "lab_test_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order_id": {
      "childTable": "lab_test_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order_id!inner": {
      "childTable": "lab_test_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order": {
      "childTable": "lab_test_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order!inner": {
      "childTable": "lab_test_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_test_orders!lab_payment_logs_order_id_fkey": {
      "childTable": "lab_test_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!lab_payment_logs_patient_id_fkey": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "lab_reports": {
    "users": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_id": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_id!inner": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab!inner": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "users!lab_reports_lab_id_fkey": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!lab_reports_patient_id_fkey": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "lab_test_order_items": {
    "lab_test_orders": {
      "childTable": "lab_test_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_test_orders!inner": {
      "childTable": "lab_test_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order_id": {
      "childTable": "lab_test_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order_id!inner": {
      "childTable": "lab_test_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order": {
      "childTable": "lab_test_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order!inner": {
      "childTable": "lab_test_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_test_orders!lab_test_order_items_order_id_fkey": {
      "childTable": "lab_test_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_tests": {
      "childTable": "lab_tests",
      "parentKey": "test_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_tests!inner": {
      "childTable": "lab_tests",
      "parentKey": "test_id",
      "childKey": "id",
      "isArray": false
    },
    "test_id": {
      "childTable": "lab_tests",
      "parentKey": "test_id",
      "childKey": "id",
      "isArray": false
    },
    "test_id!inner": {
      "childTable": "lab_tests",
      "parentKey": "test_id",
      "childKey": "id",
      "isArray": false
    },
    "test": {
      "childTable": "lab_tests",
      "parentKey": "test_id",
      "childKey": "id",
      "isArray": false
    },
    "test!inner": {
      "childTable": "lab_tests",
      "parentKey": "test_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_tests!lab_test_order_items_test_id_fkey": {
      "childTable": "lab_tests",
      "parentKey": "test_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "lab_tests": {
    "lab_test_order_items": {
      "childTable": "lab_test_order_items",
      "parentKey": "id",
      "childKey": "test_id",
      "isArray": true
    },
    "lab_test_order_items!lab_test_order_items_test_id_fkey": {
      "childTable": "lab_test_order_items",
      "parentKey": "id",
      "childKey": "test_id",
      "isArray": true
    },
    "lab_test_categories": {
      "childTable": "lab_test_categories",
      "parentKey": "category_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_test_categories!inner": {
      "childTable": "lab_test_categories",
      "parentKey": "category_id",
      "childKey": "id",
      "isArray": false
    },
    "category_id": {
      "childTable": "lab_test_categories",
      "parentKey": "category_id",
      "childKey": "id",
      "isArray": false
    },
    "category_id!inner": {
      "childTable": "lab_test_categories",
      "parentKey": "category_id",
      "childKey": "id",
      "isArray": false
    },
    "category": {
      "childTable": "lab_test_categories",
      "parentKey": "category_id",
      "childKey": "id",
      "isArray": false
    },
    "category!inner": {
      "childTable": "lab_test_categories",
      "parentKey": "category_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_test_categories!lab_tests_category_id_fkey": {
      "childTable": "lab_test_categories",
      "parentKey": "category_id",
      "childKey": "id",
      "isArray": false
    },
    "users": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_id": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab_id!inner": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "lab!inner": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    },
    "users!lab_tests_lab_id_fkey": {
      "childTable": "users",
      "parentKey": "lab_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "prescriptions": {
    "lab_test_orders": {
      "childTable": "lab_test_orders",
      "parentKey": "id",
      "childKey": "prescription_id",
      "isArray": true
    },
    "lab_test_orders!lab_test_orders_prescription_id_fkey": {
      "childTable": "lab_test_orders",
      "parentKey": "id",
      "childKey": "prescription_id",
      "isArray": true
    },
    "medicine_orders": {
      "childTable": "medicine_orders",
      "parentKey": "id",
      "childKey": "prescription_id",
      "isArray": true
    },
    "medicine_orders!medicine_orders_prescription_id_fkey": {
      "childTable": "medicine_orders",
      "parentKey": "id",
      "childKey": "prescription_id",
      "isArray": true
    },
    "appointments": {
      "childTable": "appointments",
      "parentKey": "appointment_id",
      "childKey": "id",
      "isArray": false
    },
    "appointments!inner": {
      "childTable": "appointments",
      "parentKey": "appointment_id",
      "childKey": "id",
      "isArray": false
    },
    "appointment_id": {
      "childTable": "appointments",
      "parentKey": "appointment_id",
      "childKey": "id",
      "isArray": false
    },
    "appointment_id!inner": {
      "childTable": "appointments",
      "parentKey": "appointment_id",
      "childKey": "id",
      "isArray": false
    },
    "appointment": {
      "childTable": "appointments",
      "parentKey": "appointment_id",
      "childKey": "id",
      "isArray": false
    },
    "appointment!inner": {
      "childTable": "appointments",
      "parentKey": "appointment_id",
      "childKey": "id",
      "isArray": false
    },
    "appointments!prescriptions_appointment_id_fkey": {
      "childTable": "appointments",
      "parentKey": "appointment_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!prescriptions_doctor_id_fkey": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details!prescriptions_patient_id_fkey": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "signed_by": {
      "childTable": "doctor_details",
      "parentKey": "signed_by",
      "childKey": "id",
      "isArray": false
    },
    "signed_by!inner": {
      "childTable": "doctor_details",
      "parentKey": "signed_by",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!prescriptions_signed_by_fkey": {
      "childTable": "doctor_details",
      "parentKey": "signed_by",
      "childKey": "id",
      "isArray": false
    }
  },
  "lab_test_categories": {
    "lab_tests": {
      "childTable": "lab_tests",
      "parentKey": "id",
      "childKey": "category_id",
      "isArray": true
    },
    "lab_tests!lab_tests_category_id_fkey": {
      "childTable": "lab_tests",
      "parentKey": "id",
      "childKey": "category_id",
      "isArray": true
    }
  },
  "legal_snapshot_index": {
    "clinical_decision_log": {
      "childTable": "clinical_decision_log",
      "parentKey": "decision_log_id",
      "childKey": "id",
      "isArray": false
    },
    "clinical_decision_log!inner": {
      "childTable": "clinical_decision_log",
      "parentKey": "decision_log_id",
      "childKey": "id",
      "isArray": false
    },
    "decision_log_id": {
      "childTable": "clinical_decision_log",
      "parentKey": "decision_log_id",
      "childKey": "id",
      "isArray": false
    },
    "decision_log_id!inner": {
      "childTable": "clinical_decision_log",
      "parentKey": "decision_log_id",
      "childKey": "id",
      "isArray": false
    },
    "decision_log": {
      "childTable": "clinical_decision_log",
      "parentKey": "decision_log_id",
      "childKey": "id",
      "isArray": false
    },
    "decision_log!inner": {
      "childTable": "clinical_decision_log",
      "parentKey": "decision_log_id",
      "childKey": "id",
      "isArray": false
    },
    "clinical_decision_log!legal_snapshot_index_decision_log_id_fkey": {
      "childTable": "clinical_decision_log",
      "parentKey": "decision_log_id",
      "childKey": "id",
      "isArray": false
    },
    "prescription_snapshot": {
      "childTable": "prescription_snapshot",
      "parentKey": "prescription_snapshot_id",
      "childKey": "id",
      "isArray": false
    },
    "prescription_snapshot!inner": {
      "childTable": "prescription_snapshot",
      "parentKey": "prescription_snapshot_id",
      "childKey": "id",
      "isArray": false
    },
    "prescription_snapshot_id": {
      "childTable": "prescription_snapshot",
      "parentKey": "prescription_snapshot_id",
      "childKey": "id",
      "isArray": false
    },
    "prescription_snapshot_id!inner": {
      "childTable": "prescription_snapshot",
      "parentKey": "prescription_snapshot_id",
      "childKey": "id",
      "isArray": false
    },
    "prescription_snapshot!legal_snapshot_index_prescription_snapshot_id_fkey": {
      "childTable": "prescription_snapshot",
      "parentKey": "prescription_snapshot_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "clinical_decision_log": {
    "legal_snapshot_index": {
      "childTable": "legal_snapshot_index",
      "parentKey": "id",
      "childKey": "decision_log_id",
      "isArray": true
    },
    "legal_snapshot_index!legal_snapshot_index_decision_log_id_fkey": {
      "childTable": "legal_snapshot_index",
      "parentKey": "id",
      "childKey": "decision_log_id",
      "isArray": true
    }
  },
  "prescription_snapshot": {
    "legal_snapshot_index": {
      "childTable": "legal_snapshot_index",
      "parentKey": "id",
      "childKey": "prescription_snapshot_id",
      "isArray": true
    },
    "legal_snapshot_index!legal_snapshot_index_prescription_snapshot_id_fkey": {
      "childTable": "legal_snapshot_index",
      "parentKey": "id",
      "childKey": "prescription_snapshot_id",
      "isArray": true
    }
  },
  "lung_health_inputs": {
    "health_assessments": {
      "childTable": "health_assessments",
      "parentKey": "assessment_id",
      "childKey": "id",
      "isArray": false
    },
    "health_assessments!inner": {
      "childTable": "health_assessments",
      "parentKey": "assessment_id",
      "childKey": "id",
      "isArray": false
    },
    "assessment_id": {
      "childTable": "health_assessments",
      "parentKey": "assessment_id",
      "childKey": "id",
      "isArray": false
    },
    "assessment_id!inner": {
      "childTable": "health_assessments",
      "parentKey": "assessment_id",
      "childKey": "id",
      "isArray": false
    },
    "assessment": {
      "childTable": "health_assessments",
      "parentKey": "assessment_id",
      "childKey": "id",
      "isArray": false
    },
    "assessment!inner": {
      "childTable": "health_assessments",
      "parentKey": "assessment_id",
      "childKey": "id",
      "isArray": false
    },
    "health_assessments!lung_health_inputs_assessment_id_fkey": {
      "childTable": "health_assessments",
      "parentKey": "assessment_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "medicine_order_items": {
    "medicine_orders": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine_orders!inner": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order_id": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order_id!inner": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order!inner": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine_orders!medicine_order_items_order_id_fkey": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "medicine_orders": {
    "medicine_order_items": {
      "childTable": "medicine_order_items",
      "parentKey": "id",
      "childKey": "order_id",
      "isArray": true
    },
    "medicine_order_items!medicine_order_items_order_id_fkey": {
      "childTable": "medicine_order_items",
      "parentKey": "id",
      "childKey": "order_id",
      "isArray": true
    },
    "chemist_details": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_details!inner": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_id": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_id!inner": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist!inner": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_details!medicine_orders_chemist_id_fkey": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "users": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!medicine_orders_patient_id_fkey": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "prescriptions": {
      "childTable": "prescriptions",
      "parentKey": "prescription_id",
      "childKey": "id",
      "isArray": false
    },
    "prescriptions!inner": {
      "childTable": "prescriptions",
      "parentKey": "prescription_id",
      "childKey": "id",
      "isArray": false
    },
    "prescription_id": {
      "childTable": "prescriptions",
      "parentKey": "prescription_id",
      "childKey": "id",
      "isArray": false
    },
    "prescription_id!inner": {
      "childTable": "prescriptions",
      "parentKey": "prescription_id",
      "childKey": "id",
      "isArray": false
    },
    "prescription": {
      "childTable": "prescriptions",
      "parentKey": "prescription_id",
      "childKey": "id",
      "isArray": false
    },
    "prescription!inner": {
      "childTable": "prescriptions",
      "parentKey": "prescription_id",
      "childKey": "id",
      "isArray": false
    },
    "prescriptions!medicine_orders_prescription_id_fkey": {
      "childTable": "prescriptions",
      "parentKey": "prescription_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine_order_invoices": {
      "childTable": "medicine_order_invoices",
      "parentKey": "id",
      "childKey": "order_id",
      "isArray": true
    },
    "medicine_order_invoices!moi_order_fkey": {
      "childTable": "medicine_order_invoices",
      "parentKey": "id",
      "childKey": "order_id",
      "isArray": true
    },
    "medicine_order_price_history": {
      "childTable": "medicine_order_price_history",
      "parentKey": "id",
      "childKey": "order_id",
      "isArray": true
    },
    "medicine_order_price_history!mop_history_order_fkey": {
      "childTable": "medicine_order_price_history",
      "parentKey": "id",
      "childKey": "order_id",
      "isArray": true
    },
    "medicine_order_payments": {
      "childTable": "medicine_order_payments",
      "parentKey": "id",
      "childKey": "order_id",
      "isArray": true
    },
    "medicine_order_payments!mop_order_fkey": {
      "childTable": "medicine_order_payments",
      "parentKey": "id",
      "childKey": "order_id",
      "isArray": true
    }
  },
  "medicine_order_invoices": {
    "medicine_orders": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine_orders!inner": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order_id": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order_id!inner": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order!inner": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine_orders!moi_order_fkey": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "medicine_order_price_history": {
    "chemist_details": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_details!inner": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_id": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_id!inner": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist!inner": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "chemist_details!mop_history_chemist_fkey": {
      "childTable": "chemist_details",
      "parentKey": "chemist_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine_orders": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine_orders!inner": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order_id": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order_id!inner": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order!inner": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine_orders!mop_history_order_fkey": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "medicine_order_payments": {
    "medicine_orders": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine_orders!inner": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order_id": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order_id!inner": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "order!inner": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "medicine_orders!mop_order_fkey": {
      "childTable": "medicine_orders",
      "parentKey": "order_id",
      "childKey": "id",
      "isArray": false
    },
    "users": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!mop_patient_fkey": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "notifications": {
    "users": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!notifications_user_id_fkey": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "nursing_consent_logs": {
    "nursing_leads": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "nursing_leads!inner": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "lead_id": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "lead_id!inner": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "lead": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "lead!inner": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "nursing_leads!nursing_consent_logs_lead_id_fkey": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "nursing_leads": {
    "nursing_consent_logs": {
      "childTable": "nursing_consent_logs",
      "parentKey": "id",
      "childKey": "lead_id",
      "isArray": true
    },
    "nursing_consent_logs!nursing_consent_logs_lead_id_fkey": {
      "childTable": "nursing_consent_logs",
      "parentKey": "id",
      "childKey": "lead_id",
      "isArray": true
    },
    "nursing_lead_assignments": {
      "childTable": "nursing_lead_assignments",
      "parentKey": "id",
      "childKey": "lead_id",
      "isArray": true
    },
    "nursing_lead_assignments!nursing_lead_assignments_lead_id_fkey": {
      "childTable": "nursing_lead_assignments",
      "parentKey": "id",
      "childKey": "lead_id",
      "isArray": true
    },
    "nursing_lead_notes": {
      "childTable": "nursing_lead_notes",
      "parentKey": "id",
      "childKey": "lead_id",
      "isArray": true
    },
    "nursing_lead_notes!nursing_lead_notes_lead_id_fkey": {
      "childTable": "nursing_lead_notes",
      "parentKey": "id",
      "childKey": "lead_id",
      "isArray": true
    },
    "staffs": {
      "childTable": "staffs",
      "parentKey": "assigned_staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staffs!inner": {
      "childTable": "staffs",
      "parentKey": "assigned_staff_id",
      "childKey": "id",
      "isArray": false
    },
    "assigned_staff_id": {
      "childTable": "staffs",
      "parentKey": "assigned_staff_id",
      "childKey": "id",
      "isArray": false
    },
    "assigned_staff_id!inner": {
      "childTable": "staffs",
      "parentKey": "assigned_staff_id",
      "childKey": "id",
      "isArray": false
    },
    "assigned_staff": {
      "childTable": "staffs",
      "parentKey": "assigned_staff_id",
      "childKey": "id",
      "isArray": false
    },
    "assigned_staff!inner": {
      "childTable": "staffs",
      "parentKey": "assigned_staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staffs!nursing_leads_assigned_staff_id_fkey": {
      "childTable": "staffs",
      "parentKey": "assigned_staff_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!nursing_leads_care_episode_id_fkey": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "nursing_referral_logs": {
      "childTable": "nursing_referral_logs",
      "parentKey": "id",
      "childKey": "lead_id",
      "isArray": true
    },
    "nursing_referral_logs!nursing_referral_logs_lead_id_fkey": {
      "childTable": "nursing_referral_logs",
      "parentKey": "id",
      "childKey": "lead_id",
      "isArray": true
    }
  },
  "nursing_lead_assignments": {
    "users": {
      "childTable": "users",
      "parentKey": "assigned_by",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "assigned_by",
      "childKey": "id",
      "isArray": false
    },
    "assigned_by": {
      "childTable": "users",
      "parentKey": "assigned_by",
      "childKey": "id",
      "isArray": false
    },
    "assigned_by!inner": {
      "childTable": "users",
      "parentKey": "assigned_by",
      "childKey": "id",
      "isArray": false
    },
    "users!nursing_lead_assignments_assigned_by_fkey": {
      "childTable": "users",
      "parentKey": "assigned_by",
      "childKey": "id",
      "isArray": false
    },
    "nursing_leads": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "nursing_leads!inner": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "lead_id": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "lead_id!inner": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "lead": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "lead!inner": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "nursing_leads!nursing_lead_assignments_lead_id_fkey": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "staffs": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staffs!inner": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staff_id": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staff_id!inner": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staff": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staff!inner": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staffs!nursing_lead_assignments_staff_id_fkey": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "staffs": {
    "nursing_lead_assignments": {
      "childTable": "nursing_lead_assignments",
      "parentKey": "id",
      "childKey": "staff_id",
      "isArray": true
    },
    "nursing_lead_assignments!nursing_lead_assignments_staff_id_fkey": {
      "childTable": "nursing_lead_assignments",
      "parentKey": "id",
      "childKey": "staff_id",
      "isArray": true
    },
    "nursing_leads": {
      "childTable": "nursing_leads",
      "parentKey": "id",
      "childKey": "assigned_staff_id",
      "isArray": true
    },
    "nursing_leads!nursing_leads_assigned_staff_id_fkey": {
      "childTable": "nursing_leads",
      "parentKey": "id",
      "childKey": "assigned_staff_id",
      "isArray": true
    },
    "staff_activity_logs": {
      "childTable": "staff_activity_logs",
      "parentKey": "id",
      "childKey": "staff_id",
      "isArray": true
    },
    "staff_activity_logs!staff_activity_logs_staff_id_fkey": {
      "childTable": "staff_activity_logs",
      "parentKey": "id",
      "childKey": "staff_id",
      "isArray": true
    },
    "staff_permission_overrides": {
      "childTable": "staff_permission_overrides",
      "parentKey": "id",
      "childKey": "staff_id",
      "isArray": true
    },
    "staff_permission_overrides!staff_permission_overrides_staff_id_fkey": {
      "childTable": "staff_permission_overrides",
      "parentKey": "id",
      "childKey": "staff_id",
      "isArray": true
    },
    "users": {
      "childTable": "users",
      "parentKey": "admin_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "admin_id",
      "childKey": "id",
      "isArray": false
    },
    "admin_id": {
      "childTable": "users",
      "parentKey": "admin_id",
      "childKey": "id",
      "isArray": false
    },
    "admin_id!inner": {
      "childTable": "users",
      "parentKey": "admin_id",
      "childKey": "id",
      "isArray": false
    },
    "admin": {
      "childTable": "users",
      "parentKey": "admin_id",
      "childKey": "id",
      "isArray": false
    },
    "admin!inner": {
      "childTable": "users",
      "parentKey": "admin_id",
      "childKey": "id",
      "isArray": false
    },
    "users!staffs_admin_id_fkey": {
      "childTable": "users",
      "parentKey": "admin_id",
      "childKey": "id",
      "isArray": false
    },
    "staff_roles": {
      "childTable": "staff_roles",
      "parentKey": "role_id",
      "childKey": "id",
      "isArray": false
    },
    "staff_roles!inner": {
      "childTable": "staff_roles",
      "parentKey": "role_id",
      "childKey": "id",
      "isArray": false
    },
    "role_id": {
      "childTable": "staff_roles",
      "parentKey": "role_id",
      "childKey": "id",
      "isArray": false
    },
    "role_id!inner": {
      "childTable": "staff_roles",
      "parentKey": "role_id",
      "childKey": "id",
      "isArray": false
    },
    "role": {
      "childTable": "staff_roles",
      "parentKey": "role_id",
      "childKey": "id",
      "isArray": false
    },
    "role!inner": {
      "childTable": "staff_roles",
      "parentKey": "role_id",
      "childKey": "id",
      "isArray": false
    },
    "staff_roles!staffs_role_id_fkey": {
      "childTable": "staff_roles",
      "parentKey": "role_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "nursing_lead_notes": {
    "nursing_leads": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "nursing_leads!inner": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "lead_id": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "lead_id!inner": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "lead": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "lead!inner": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "nursing_leads!nursing_lead_notes_lead_id_fkey": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "nursing_referral_logs": {
    "nursing_leads": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "nursing_leads!inner": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "lead_id": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "lead_id!inner": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "lead": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "lead!inner": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "nursing_leads!nursing_referral_logs_lead_id_fkey": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "offline_queue": {
    "consultations": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!offline_queue_consultation_id_fkey": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details!offline_queue_patient_id_fkey": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "ops_task": {
    "users": {
      "childTable": "users",
      "parentKey": "assigned_to",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "assigned_to",
      "childKey": "id",
      "isArray": false
    },
    "assigned_to": {
      "childTable": "users",
      "parentKey": "assigned_to",
      "childKey": "id",
      "isArray": false
    },
    "assigned_to!inner": {
      "childTable": "users",
      "parentKey": "assigned_to",
      "childKey": "id",
      "isArray": false
    },
    "users!ops_task_assigned_to_fkey": {
      "childTable": "users",
      "parentKey": "assigned_to",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!ops_task_care_episode_id_fkey": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "incident": {
      "childTable": "incident",
      "parentKey": "incident_id",
      "childKey": "id",
      "isArray": false
    },
    "incident!inner": {
      "childTable": "incident",
      "parentKey": "incident_id",
      "childKey": "id",
      "isArray": false
    },
    "incident_id": {
      "childTable": "incident",
      "parentKey": "incident_id",
      "childKey": "id",
      "isArray": false
    },
    "incident_id!inner": {
      "childTable": "incident",
      "parentKey": "incident_id",
      "childKey": "id",
      "isArray": false
    },
    "incident!ops_task_incident_id_fkey": {
      "childTable": "incident",
      "parentKey": "incident_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "patient_consent_log": {
    "patient_details": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_details!patient_consent_log_patient_id_fkey": {
      "childTable": "patient_details",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "patient_outcome": {
    "care_episodes": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!patient_outcome_care_episode_id_fkey": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!patient_outcome_consultation_id_fkey": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "users": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient_id!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "patient!inner": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    },
    "users!patient_outcome_patient_id_fkey": {
      "childTable": "users",
      "parentKey": "patient_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "pharmacist_details": {
    "users": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "id": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "id!inner": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    },
    "users!pharmacist_details_id_fkey": {
      "childTable": "users",
      "parentKey": "id",
      "childKey": "id",
      "isArray": false
    }
  },
  "policy_features": {
    "health_insurance_policies": {
      "childTable": "health_insurance_policies",
      "parentKey": "policy_id",
      "childKey": "id",
      "isArray": false
    },
    "health_insurance_policies!inner": {
      "childTable": "health_insurance_policies",
      "parentKey": "policy_id",
      "childKey": "id",
      "isArray": false
    },
    "policy_id": {
      "childTable": "health_insurance_policies",
      "parentKey": "policy_id",
      "childKey": "id",
      "isArray": false
    },
    "policy_id!inner": {
      "childTable": "health_insurance_policies",
      "parentKey": "policy_id",
      "childKey": "id",
      "isArray": false
    },
    "policy": {
      "childTable": "health_insurance_policies",
      "parentKey": "policy_id",
      "childKey": "id",
      "isArray": false
    },
    "policy!inner": {
      "childTable": "health_insurance_policies",
      "parentKey": "policy_id",
      "childKey": "id",
      "isArray": false
    },
    "health_insurance_policies!policy_features_policy_id_fkey": {
      "childTable": "health_insurance_policies",
      "parentKey": "policy_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "prescription_service_map": {
    "care_episodes": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!prescription_service_map_care_episode_id_fkey": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!prescription_service_map_consultation_id_fkey": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "prescription_templates": {
    "doctor_details": {
      "childTable": "doctor_details",
      "parentKey": "created_by",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!inner": {
      "childTable": "doctor_details",
      "parentKey": "created_by",
      "childKey": "id",
      "isArray": false
    },
    "created_by": {
      "childTable": "doctor_details",
      "parentKey": "created_by",
      "childKey": "id",
      "isArray": false
    },
    "created_by!inner": {
      "childTable": "doctor_details",
      "parentKey": "created_by",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!prescription_templates_created_by_fkey": {
      "childTable": "doctor_details",
      "parentKey": "created_by",
      "childKey": "id",
      "isArray": false
    }
  },
  "prescription_validation_log": {
    "doctor_details": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_id!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor!inner": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    },
    "doctor_details!prescription_validation_log_doctor_id_fkey": {
      "childTable": "doctor_details",
      "parentKey": "doctor_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "provider_ranking_event": {
    "care_episodes": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!provider_ranking_event_care_episode_id_fkey": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!provider_ranking_event_consultation_id_fkey": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "risk_flags": {
    "consultations": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!risk_flags_consultation_id_fkey": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "staff_activity_logs": {
    "staffs": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staffs!inner": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staff_id": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staff_id!inner": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staff": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staff!inner": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staffs!staff_activity_logs_staff_id_fkey": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "staff_permission_overrides": {
    "staff_permissions_master": {
      "childTable": "staff_permissions_master",
      "parentKey": "permission_id",
      "childKey": "id",
      "isArray": false
    },
    "staff_permissions_master!inner": {
      "childTable": "staff_permissions_master",
      "parentKey": "permission_id",
      "childKey": "id",
      "isArray": false
    },
    "permission_id": {
      "childTable": "staff_permissions_master",
      "parentKey": "permission_id",
      "childKey": "id",
      "isArray": false
    },
    "permission_id!inner": {
      "childTable": "staff_permissions_master",
      "parentKey": "permission_id",
      "childKey": "id",
      "isArray": false
    },
    "permission": {
      "childTable": "staff_permissions_master",
      "parentKey": "permission_id",
      "childKey": "id",
      "isArray": false
    },
    "permission!inner": {
      "childTable": "staff_permissions_master",
      "parentKey": "permission_id",
      "childKey": "id",
      "isArray": false
    },
    "staff_permissions_master!staff_permission_overrides_permission_id_fkey": {
      "childTable": "staff_permissions_master",
      "parentKey": "permission_id",
      "childKey": "id",
      "isArray": false
    },
    "staffs": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staffs!inner": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staff_id": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staff_id!inner": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staff": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staff!inner": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staffs!staff_permission_overrides_staff_id_fkey": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "staff_permissions_master": {
    "staff_permission_overrides": {
      "childTable": "staff_permission_overrides",
      "parentKey": "id",
      "childKey": "permission_id",
      "isArray": true
    },
    "staff_permission_overrides!staff_permission_overrides_permission_id_fkey": {
      "childTable": "staff_permission_overrides",
      "parentKey": "id",
      "childKey": "permission_id",
      "isArray": true
    },
    "staff_role_permissions": {
      "childTable": "staff_role_permissions",
      "parentKey": "id",
      "childKey": "permission_id",
      "isArray": true
    },
    "staff_role_permissions!staff_role_permissions_permission_id_fkey": {
      "childTable": "staff_role_permissions",
      "parentKey": "id",
      "childKey": "permission_id",
      "isArray": true
    }
  },
  "staff_role_permissions": {
    "staff_permissions_master": {
      "childTable": "staff_permissions_master",
      "parentKey": "permission_id",
      "childKey": "id",
      "isArray": false
    },
    "staff_permissions_master!inner": {
      "childTable": "staff_permissions_master",
      "parentKey": "permission_id",
      "childKey": "id",
      "isArray": false
    },
    "permission_id": {
      "childTable": "staff_permissions_master",
      "parentKey": "permission_id",
      "childKey": "id",
      "isArray": false
    },
    "permission_id!inner": {
      "childTable": "staff_permissions_master",
      "parentKey": "permission_id",
      "childKey": "id",
      "isArray": false
    },
    "permission": {
      "childTable": "staff_permissions_master",
      "parentKey": "permission_id",
      "childKey": "id",
      "isArray": false
    },
    "permission!inner": {
      "childTable": "staff_permissions_master",
      "parentKey": "permission_id",
      "childKey": "id",
      "isArray": false
    },
    "staff_permissions_master!staff_role_permissions_permission_id_fkey": {
      "childTable": "staff_permissions_master",
      "parentKey": "permission_id",
      "childKey": "id",
      "isArray": false
    },
    "staff_roles": {
      "childTable": "staff_roles",
      "parentKey": "role_id",
      "childKey": "id",
      "isArray": false
    },
    "staff_roles!inner": {
      "childTable": "staff_roles",
      "parentKey": "role_id",
      "childKey": "id",
      "isArray": false
    },
    "role_id": {
      "childTable": "staff_roles",
      "parentKey": "role_id",
      "childKey": "id",
      "isArray": false
    },
    "role_id!inner": {
      "childTable": "staff_roles",
      "parentKey": "role_id",
      "childKey": "id",
      "isArray": false
    },
    "role": {
      "childTable": "staff_roles",
      "parentKey": "role_id",
      "childKey": "id",
      "isArray": false
    },
    "role!inner": {
      "childTable": "staff_roles",
      "parentKey": "role_id",
      "childKey": "id",
      "isArray": false
    },
    "staff_roles!staff_role_permissions_role_id_fkey": {
      "childTable": "staff_roles",
      "parentKey": "role_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "staff_roles": {
    "staff_role_permissions": {
      "childTable": "staff_role_permissions",
      "parentKey": "id",
      "childKey": "role_id",
      "isArray": true
    },
    "staff_role_permissions!staff_role_permissions_role_id_fkey": {
      "childTable": "staff_role_permissions",
      "parentKey": "id",
      "childKey": "role_id",
      "isArray": true
    },
    "staffs": {
      "childTable": "staffs",
      "parentKey": "id",
      "childKey": "role_id",
      "isArray": true
    },
    "staffs!staffs_role_id_fkey": {
      "childTable": "staffs",
      "parentKey": "id",
      "childKey": "role_id",
      "isArray": true
    }
  },
  "user_badges": {
    "users": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!user_badges_user_id_fkey": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "user_session_state": {
    "care_episodes": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode_id!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episode!inner": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "care_episodes!user_session_state_care_episode_id_fkey": {
      "childTable": "care_episodes",
      "parentKey": "care_episode_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation_id!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultation!inner": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "consultations!user_session_state_consultation_id_fkey": {
      "childTable": "consultations",
      "parentKey": "consultation_id",
      "childKey": "id",
      "isArray": false
    },
    "users": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user_id!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "user!inner": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    },
    "users!user_session_state_user_id_fkey": {
      "childTable": "users",
      "parentKey": "user_id",
      "childKey": "id",
      "isArray": false
    }
  },

  // ─── Nursing Tables ───────────────────────────────────────────
  "nursing_leads": {
    "staffs": {
      "childTable": "staffs",
      "parentKey": "assigned_staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staffs!nursing_leads_assigned_staff_id_fkey": {
      "childTable": "staffs",
      "parentKey": "assigned_staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staffs!inner": {
      "childTable": "staffs",
      "parentKey": "assigned_staff_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "nursing_lead_assignments": {
    "staffs": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    },
    "staffs!inner": {
      "childTable": "staffs",
      "parentKey": "staff_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "nursing_lead_notes": {
    "nursing_leads": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "nursing_leads!inner": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "nursing_referral_logs": {
    "nursing_leads": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "nursing_leads!inner": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    }
  },
  "nursing_consent_logs": {
    "nursing_leads": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    },
    "nursing_leads!inner": {
      "childTable": "nursing_leads",
      "parentKey": "lead_id",
      "childKey": "id",
      "isArray": false
    }
  }
};

function parseSelectFields(selectStr) {
  if (!selectStr) return ['*'];
  const fields = [];
  let currentField = '';
  let bracketDepth = 0;
  
  for (let i = 0; i < selectStr.length; i++) {
    const char = selectStr[i];
    if (char === '(') bracketDepth++;
    if (char === ')') bracketDepth--;
    
    if (char === ',' && bracketDepth === 0) {
      fields.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField.trim()) {
    fields.push(currentField.trim());
  }
  return fields;
}

function parseRelation(field) {
  const match = field.match(/^([a-zA-Z0-9_]+:)?([a-zA-Z0-9_-]+)(![a-zA-Z0-9_]+)?\s*\(\s*([\s\S]*)\s*\)$/);
  if (!match) return null;
  
  let alias = match[1] ? match[1].slice(0, -1) : null;
  let relation = match[2];
  let modifier = match[3] ? match[3].slice(1) : null;
  let subfieldsStr = match[4];
  
  if (!alias) alias = relation;
  
  return { alias, relation, modifier, subfieldsStr };
}

const USERS_COLUMNS = new Set([
  'id', 'phone_number', 'otp_code', 'otp_expires_at', 'role', 
  'is_verified', 'created_at', 'updated_at', 'profile_picture', 
  'status', 'un_id', 'fcm_token'
]);

function compileRelationSubquery(parentTable, parentAlias, relationObj) {
  const { alias, relation, modifier, subfieldsStr } = relationObj;
  
  let config = null;
  if (RELATION_MAP[parentTable]) {
    config = RELATION_MAP[parentTable][relation + (modifier ? '!' + modifier : '')] || RELATION_MAP[parentTable][relation];
  }
  
  if (!config) {
    let childTable = relation;
    let parentKey = `${relation}_id`;
    let childKey = "id";
    let isArray = false;

    if (relation === 'doctor_id' || relation === 'doctor') {
      childTable = 'users';
      parentKey = 'doctor_id';
    } else if (relation === 'patient_id' || relation === 'patient') {
      childTable = 'users';
      parentKey = 'patient_id';
    } else if (relation === 'chemist_id' || relation === 'chemist') {
      childTable = 'chemist_details';
      parentKey = 'chemist_id';
    } else if (relation === 'prescription_id' || relation === 'prescription') {
      childTable = 'prescriptions';
      parentKey = 'prescription_id';
    } else if (relation === 'appointment_id' || relation === 'appointment') {
      childTable = 'appointments';
      parentKey = 'appointment_id';
    }

    config = { childTable, parentKey, childKey, isArray };
  }
  
  const childTable = config.childTable;
  const childKey = config.childKey;
  const parentKey = config.parentKey;
  const isArray = config.isArray;
  
  const subfields = parseSelectFields(subfieldsStr);
  const selectItems = [];
  
  for (const field of subfields) {
    if (field === '*') {
      selectItems.push(`${childTable}.*`);
    } else {
      const rel = parseRelation(field);
      if (rel) {
        const subquery = compileRelationSubquery(childTable, childTable, rel);
        selectItems.push(`${subquery} AS ${rel.alias}`);
      } else {
        const aliasMatch = field.match(/^([a-zA-Z0-9_]+):([a-zA-Z0-9_]+)$/);
        const actualField = aliasMatch ? aliasMatch[2] : field;
        const aliasName = aliasMatch ? aliasMatch[1] : field;
        
        if (childTable === 'users' && !USERS_COLUMNS.has(actualField)) {
          let resolvedSubquery = 'NULL';
          const relLower = relation.toLowerCase();
          if (relLower.includes('doctor')) {
            resolvedSubquery = `(SELECT "${actualField}" FROM doctor_details WHERE doctor_details.id = users.id)`;
          } else if (relLower.includes('patient')) {
            resolvedSubquery = `(SELECT "${actualField}" FROM patient_details WHERE patient_details.id = users.id)`;
          } else if (relLower.includes('staff')) {
            resolvedSubquery = `(SELECT "${actualField}" FROM staffs WHERE staffs.id = users.id)`;
          } else {
            resolvedSubquery = `COALESCE(
              (SELECT "${actualField}" FROM doctor_details WHERE doctor_details.id = users.id),
              (SELECT "${actualField}" FROM patient_details WHERE patient_details.id = users.id),
              (SELECT "${actualField}" FROM staffs WHERE staffs.id = users.id)
            )`;
          }
          selectItems.push(`${resolvedSubquery} AS "${aliasName}"`);
        } else {
          if (aliasMatch) {
            selectItems.push(`${childTable}."${aliasMatch[2]}" AS "${aliasMatch[1]}"`);
          } else {
            selectItems.push(`${childTable}."${field}"`);
          }
        }
      }
    }
  }
  
  const selectClause = selectItems.join(', ');
  
  if (isArray) {
    return `COALESCE((SELECT json_agg(t) FROM (SELECT ${selectClause} FROM ${childTable} WHERE ${childTable}.${childKey} = ${parentAlias}.${parentKey}) t), '[]'::json)`;
  } else {
    return `(SELECT row_to_json(t) FROM (SELECT ${selectClause} FROM ${childTable} WHERE ${childTable}.${childKey} = ${parentAlias}.${parentKey} LIMIT 1) t)`;
  }
}

export class SupabasePostgresQueryBuilder {
  constructor(tableName, sqlClient) {
    this.tableName = tableName;
    this.sql = sqlClient;
    this.queryType = 'SELECT';
    this.selectColumns = '*';
    this.countOption = null;
    this.insertValues = null;
    this.updateValues = null;
    this.filters = [];
    this.orderBy = [];
    this.limitVal = null;
    this.offsetVal = null;
    this.isSingle = false;
    this.isMaybeSingle = false;
    this.whereClauses = [];
    this.parameters = [];
  }

  select(columns = '*', options = {}) {
    this.selectColumns = columns;
    if (options.count) {
      this.countOption = options.count;
    }
    return this;
  }

  insert(values) {
    this.queryType = 'INSERT';
    this.insertValues = values;
    return this;
  }

  update(values) {
    this.queryType = 'UPDATE';
    this.updateValues = values;
    return this;
  }

  delete() {
    this.queryType = 'DELETE';
    return this;
  }

  upsert(values, options = {}) {
    this.queryType = 'UPSERT';
    this.insertValues = values;
    this.upsertOptions = options;
    return this;
  }

  eq(col, val) {
    this.filters.push({ type: 'eq', col, val });
    return this;
  }

  neq(col, val) {
    this.filters.push({ type: 'neq', col, val });
    return this;
  }

  gt(col, val) {
    this.filters.push({ type: 'gt', col, val });
    return this;
  }

  gte(col, val) {
    this.filters.push({ type: 'gte', col, val });
    return this;
  }

  lt(col, val) {
    this.filters.push({ type: 'lt', col, val });
    return this;
  }

  lte(col, val) {
    this.filters.push({ type: 'lte', col, val });
    return this;
  }

  like(col, val) {
    this.filters.push({ type: 'like', col, val });
    return this;
  }

  ilike(col, val) {
    this.filters.push({ type: 'ilike', col, val });
    return this;
  }

  is(col, val) {
    this.filters.push({ type: 'is', col, val });
    return this;
  }

  in(col, valArray) {
    this.filters.push({ type: 'in', col, val: valArray });
    return this;
  }

  not(col, op, val) {
    this.filters.push({ type: 'not', col, op, val });
    return this;
  }

  or(exprString) {
    this.filters.push({ type: 'or', exprString });
    return this;
  }

  order(col, options = {}) {
    const ascending = options.ascending !== false;
    this.orderBy.push(`"${col}" ${ascending ? 'ASC' : 'DESC'}`);
    return this;
  }

  limit(limitVal) {
    this.limitVal = limitVal;
    return this;
  }

  range(from, to) {
    this.limitVal = to - from + 1;
    this.offsetVal = from;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  compileFilters() {
    const clauses = [...this.whereClauses];
    
    for (const f of this.filters) {
      if (f.type === 'or') {
        const parts = f.exprString.split(',');
        const orClauses = [];
        for (const part of parts) {
          const match = part.match(/^([a-zA-Z0-9_.]+)\.(eq|neq|gt|gte|lt|lte|like|ilike|is)\.([\s\S]*)$/);
          if (match) {
            const rawCol = match[1];
            const op = match[2];
            let val = match[3];
            
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);

            let sqlCol = `"${rawCol}"`;
            let isForeign = false;
            let foreignExistsPrefix = '';
            let foreignExistsSuffix = '';

            if (rawCol.includes('.')) {
              const rparts = rawCol.split('.');
              if (rparts.length === 2) {
                const relAlias = rparts[0];
                const actualCol = rparts[1];
                let config = null;
                if (RELATION_MAP[this.tableName]) {
                  config = RELATION_MAP[this.tableName][relAlias] || RELATION_MAP[this.tableName][relAlias + '!inner'];
                }
                if (!config) {
                  config = { childTable: relAlias, parentKey: `${relAlias}_id`, childKey: "id", isArray: false };
                }
                sqlCol = `"${config.childTable}"."${actualCol}"`;
                foreignExistsPrefix = `EXISTS (SELECT 1 FROM "${config.childTable}" WHERE "${config.childTable}"."${config.childKey}" = "${this.tableName}"."${config.parentKey}" AND `;
                foreignExistsSuffix = `)`;
                isForeign = true;
              }
            }

            let clause = '';
            if (op === 'is') {
              if (val === 'null') clause = `${sqlCol} IS NULL`;
              else if (val === 'not.null') clause = `${sqlCol} IS NOT NULL`;
              else clause = `${sqlCol} = ${val}`;
            } else {
              let sqlOp = '=';
              if (op === 'neq') sqlOp = '!=';
              else if (op === 'gt') sqlOp = '>';
              else if (op === 'gte') sqlOp = '>=';
              else if (op === 'lt') sqlOp = '<';
              else if (op === 'lte') sqlOp = '<=';
              else if (op === 'like') sqlOp = 'LIKE';
              else if (op === 'ilike') sqlOp = 'ILIKE';

              this.parameters.push(val);
              clause = `${sqlCol} ${sqlOp} $${this.parameters.length}`;
            }

            if (clause) {
              if (isForeign) orClauses.push(`${foreignExistsPrefix}${clause}${foreignExistsSuffix}`);
              else orClauses.push(clause);
            }
          }
        }
        if (orClauses.length > 0) {
          clauses.push(`(${orClauses.join(' OR ')})`);
        }
      } else {
        const rawCol = f.col;
        let val = f.val;

        // Gracefully handle non-numeric values for users.status (smallint)
        if (this.tableName?.toLowerCase() === 'users' && rawCol === 'status') {
          if (f.type === 'in') {
            const vals = Array.isArray(val) ? val : [val];
            const parsed = vals.map(v => parseInt(v, 10)).filter(v => !isNaN(v));
            if (parsed.length === 0) { clauses.push('1 = 0'); continue; }
            val = parsed;
          } else {
            const num = parseInt(val, 10);
            if (isNaN(num)) {
              if (f.type === 'neq') clauses.push('1 = 1');
              else clauses.push('1 = 0');
              continue;
            }
            val = num;
          }
        }

        let sqlCol = `"${this.tableName}"."${rawCol}"`;
        let isForeign = false;
        let foreignExistsPrefix = '';
        let foreignExistsSuffix = '';

        if (rawCol.includes('.')) {
          const rparts = rawCol.split('.');
          if (rparts.length === 2) {
            const relAlias = rparts[0];
            const actualCol = rparts[1];
            let config = null;
            if (RELATION_MAP[this.tableName]) {
              config = RELATION_MAP[this.tableName][relAlias] || RELATION_MAP[this.tableName][relAlias + '!inner'];
            }
            if (!config) {
              config = { childTable: relAlias, parentKey: `${relAlias}_id`, childKey: "id", isArray: false };
            }
            sqlCol = `"${config.childTable}"."${actualCol}"`;
            foreignExistsPrefix = `EXISTS (SELECT 1 FROM "${config.childTable}" WHERE "${config.childTable}"."${config.childKey}" = "${this.tableName}"."${config.parentKey}" AND `;
            foreignExistsSuffix = `)`;
            isForeign = true;
          }
        }
        
        let clause = '';
        if (f.type === 'eq') {
          this.parameters.push(val);
          clause = `${sqlCol} = $${this.parameters.length}`;
        } else if (f.type === 'neq') {
          this.parameters.push(val);
          clause = `${sqlCol} != $${this.parameters.length}`;
        } else if (f.type === 'gt') {
          this.parameters.push(val);
          clause = `${sqlCol} > $${this.parameters.length}`;
        } else if (f.type === 'gte') {
          this.parameters.push(val);
          clause = `${sqlCol} >= $${this.parameters.length}`;
        } else if (f.type === 'lt') {
          this.parameters.push(val);
          clause = `${sqlCol} < $${this.parameters.length}`;
        } else if (f.type === 'lte') {
          this.parameters.push(val);
          clause = `${sqlCol} <= $${this.parameters.length}`;
        } else if (f.type === 'like') {
          this.parameters.push(val);
          clause = `${sqlCol} LIKE $${this.parameters.length}`;
        } else if (f.type === 'ilike') {
          this.parameters.push(val);
          clause = `${sqlCol} ILIKE $${this.parameters.length}`;
        } else if (f.type === 'is') {
          if (val === null || val === 'null') {
            clause = `${sqlCol} IS NULL`;
          } else if (val === true || val === 'true') {
            clause = `${sqlCol} IS TRUE`;
          } else if (val === false || val === 'false') {
            clause = `${sqlCol} IS FALSE`;
          } else {
            this.parameters.push(val);
            clause = `${sqlCol} = $${this.parameters.length}`;
          }
        } else if (f.type === 'in') {
          this.parameters.push(val);
          clause = `${sqlCol} = ANY($${this.parameters.length})`;
        } else if (f.type === 'not') {
          const subOp = f.op;
          if (subOp === 'is') {
            if (val === null || val === 'null') {
              clause = `${sqlCol} IS NOT NULL`;
            } else if (val === true || val === 'true') {
              clause = `${sqlCol} IS NOT TRUE`;
            } else if (val === false || val === 'false') {
              clause = `${sqlCol} IS NOT FALSE`;
            } else {
              this.parameters.push(val);
              clause = `${sqlCol} != $${this.parameters.length}`;
            }
          } else if (subOp === 'eq') {
            this.parameters.push(val);
            clause = `${sqlCol} != $${this.parameters.length}`;
          } else if (subOp === 'neq') {
            this.parameters.push(val);
            clause = `${sqlCol} = $${this.parameters.length}`;
          } else if (subOp === 'in') {
            this.parameters.push(val);
            clause = `NOT (${sqlCol} = ANY($${this.parameters.length}))`;
          } else if (subOp === 'like') {
            this.parameters.push(val);
            clause = `${sqlCol} NOT LIKE $${this.parameters.length}`;
          } else if (subOp === 'ilike') {
            this.parameters.push(val);
            clause = `${sqlCol} NOT ILIKE $${this.parameters.length}`;
          } else {
            this.parameters.push(val);
            clause = `${sqlCol} != $${this.parameters.length}`;
          }
        }

        if (clause) {
          if (isForeign) clauses.push(`${foreignExistsPrefix}${clause}${foreignExistsSuffix}`);
          else clauses.push(clause);
        }
      }
    }
    
    return clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  }

  async execute() {
    let queryStr = '';
    try {
      this.parameters = [];

      if (this.queryType === 'SELECT') {
        const selectFields = parseSelectFields(this.selectColumns);
        const selectItems = [];

        if (this.countOption) {
          selectItems.push('COUNT(*) OVER() as __full_count');
        }

        for (const field of selectFields) {
          if (field === '*') {
            selectItems.push(`"${this.tableName}".*`);
          } else {
            const rel = parseRelation(field);
            if (rel) {
              const subquery = compileRelationSubquery(this.tableName, `"${this.tableName}"`, rel);
              selectItems.push(`${subquery} AS ${rel.alias}`);
              
              if (rel.modifier === 'inner') {
                let config = null;
                if (RELATION_MAP[this.tableName]) {
                  config = RELATION_MAP[this.tableName][rel.relation + '!inner'] || RELATION_MAP[this.tableName][rel.relation];
                }
                if (!config) config = { childTable: rel.relation, parentKey: `${rel.relation}_id`, childKey: "id" };
                this.whereClauses.push(`EXISTS (SELECT 1 FROM ${config.childTable} WHERE ${config.childTable}.${config.childKey} = "${this.tableName}".${config.parentKey})`);
              }
            } else {
              const aliasMatch = field.match(/^([a-zA-Z0-9_]+):([a-zA-Z0-9_]+)$/);
              if (aliasMatch) {
                selectItems.push(`"${this.tableName}"."${aliasMatch[2]}" AS "${aliasMatch[1]}"`);
              } else {
                selectItems.push(`"${this.tableName}"."${field}"`);
              }
            }
          }
        }

        const selectClause = selectItems.join(', ');
        const whereClause = this.compileFilters();
        
        let orderClause = '';
        if (this.orderBy.length > 0) {
          orderClause = `ORDER BY ${this.orderBy.join(', ')}`;
        }

        let limitClause = '';
        if (this.limitVal !== null) {
          limitClause = `LIMIT ${this.limitVal}`;
        }

        let offsetClause = '';
        if (this.offsetVal !== null) {
          offsetClause = `OFFSET ${this.offsetVal}`;
        }

        queryStr = `SELECT ${selectClause} FROM "${this.tableName}" ${whereClause} ${orderClause} ${limitClause} ${offsetClause}`;

      } else if (this.queryType === 'INSERT') {
        const isArray = Array.isArray(this.insertValues);
        const records = isArray ? this.insertValues : [this.insertValues];
        
        if (records.length === 0) {
          return { data: [], error: null, count: 0 };
        }

        const keys = Array.from(new Set(records.flatMap(r => Object.keys(r))));
        const columns = keys.map(k => `"${k}"`).join(', ');
        
        const valuePlaceholders = [];
        for (const record of records) {
          const rowPlaceholders = [];
          for (const key of keys) {
            const val = record[key];
            this.parameters.push(val === undefined ? null : val);
            rowPlaceholders.push(`$${this.parameters.length}`);
          }
          valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
        }

        queryStr = `INSERT INTO "${this.tableName}" (${columns}) VALUES ${valuePlaceholders.join(', ')} RETURNING *`;

      } else if (this.queryType === 'UPSERT') {
        const isArray = Array.isArray(this.insertValues);
        const records = isArray ? this.insertValues : [this.insertValues];
        
        if (records.length === 0) {
          return { data: [], error: null, count: 0 };
        }

        const keys = Array.from(new Set(records.flatMap(r => Object.keys(r))));
        const columns = keys.map(k => `"${k}"`).join(', ');
        
        const valuePlaceholders = [];
        for (const record of records) {
          const rowPlaceholders = [];
          for (const key of keys) {
            const val = record[key];
            this.parameters.push(val === undefined ? null : val);
            rowPlaceholders.push(`$${this.parameters.length}`);
          }
          valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
        }

        const options = this.upsertOptions || {};
        const onConflict = options.onConflict;
        const ignoreDuplicates = options.ignoreDuplicates === true;

        const conflictCols = onConflict ? onConflict.split(',').map(c => c.trim()) : ['id'];
        const conflictClause = conflictCols.map(c => `"${c}"`).join(', ');

        let actionClause = 'DO NOTHING';
        if (!ignoreDuplicates) {
          const updateCols = keys.filter(k => !conflictCols.includes(k));
          if (updateCols.length > 0) {
            const updateSet = updateCols.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');
            actionClause = `DO UPDATE SET ${updateSet}`;
          }
        }

        queryStr = `INSERT INTO "${this.tableName}" (${columns}) VALUES ${valuePlaceholders.join(', ')} ON CONFLICT (${conflictClause}) ${actionClause} RETURNING *`;

      } else if (this.queryType === 'UPDATE') {
        const setClauses = [];
        for (const [key, val] of Object.entries(this.updateValues)) {
          this.parameters.push(val === undefined ? null : val);
          setClauses.push(`"${key}" = $${this.parameters.length}`);
        }

        const whereClause = this.compileFilters();
        queryStr = `UPDATE "${this.tableName}" SET ${setClauses.join(', ')} ${whereClause} RETURNING *`;

      } else if (this.queryType === 'DELETE') {
        const whereClause = this.compileFilters();
        queryStr = `DELETE FROM "${this.tableName}" ${whereClause} RETURNING *`;
      }

      const result = await this.sql.unsafe(queryStr, this.parameters);
      let data = Array.from(result);

      let count = null;
      if (this.countOption && data.length > 0) {
        count = parseInt(data[0].__full_count || 0, 10);
        data.forEach(row => delete row.__full_count);
      } else if (this.countOption) {
        count = 0;
      }

      if (this.isSingle) {
        if (data.length === 0) {
          return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" }, count };
        }
        return { data: data[0], error: null, count };
      }

      if (this.isMaybeSingle) {
        if (data.length === 0) {
          return { data: null, error: null, count };
        }
        return { data: data[0], error: null, count };
      }

      return { data, error: null, count };

    } catch (err) {
      console.error("[Compatibility Layer] SQL execution error:", err.message, "Query:", queryStr);
      return { data: null, error: { message: err.message, details: err.detail, hint: err.hint, code: err.code }, count: null };
    }
  }

  then(onfulfilled, onrejected) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export class SupabasePostgresRpcBuilder {
  constructor(funcName, params, sqlClient) {
    this.funcName = funcName;
    this.params = params || {};
    this.sql = sqlClient;
    this.isSingle = false;
    this.isMaybeSingle = false;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async execute() {
    let queryStr = '';
    const parameters = [];

    try {
      if (this.funcName === 'nextval') {
        const seqName = this.params.seq_name || (Array.isArray(this.params) ? this.params[0] : null);
        queryStr = `SELECT nextval($1) AS val`;
        parameters.push(seqName);
      } else {
        const isArray = Array.isArray(this.params);
        if (isArray) {
          const placeholders = this.params.map((val, i) => {
            parameters.push(val);
            return `$${i + 1}`;
          });
          queryStr = `SELECT * FROM "${this.funcName}"(${placeholders.join(', ')})`;
        } else {
          const keys = Object.keys(this.params);
          const placeholders = keys.map((key, i) => {
            parameters.push(this.params[key]);
            return `"${key}" => $${i + 1}`;
          });
          queryStr = `SELECT * FROM "${this.funcName}"(${placeholders.join(', ')})`;
        }
      }

      const result = await this.sql.unsafe(queryStr, parameters);
      let data = Array.from(result);

      if (this.funcName === 'nextval' && data.length > 0) {
        const val = parseInt(data[0].val, 10);
        if (this.isSingle) {
          return { data: val, error: null };
        }
        return { data: val, error: null };
      }

      if (this.isSingle) {
        if (data.length === 0) {
          return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned" } };
        }
        return { data: data[0], error: null };
      }

      if (this.isMaybeSingle) {
        if (data.length === 0) {
          return { data: null, error: null };
        }
        return { data: data[0], error: null };
      }

      return { data, error: null };

    } catch (err) {
      console.error("[Compatibility Layer] RPC execution error:", err.message, "Query:", queryStr);
      return { data: null, error: { message: err.message, details: err.detail } };
    }
  }

  then(onfulfilled, onrejected) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PostgREST REST API Emulation / Fetch Interceptor
// ─────────────────────────────────────────────────────────────────────────────
async function executeMockPostgrest(url, options = {}) {
  const urlObj = new URL(url);
  const path = urlObj.pathname;
  const table = path.replace(/^\/rest\/v1\//, '');
  const method = (options.method || 'GET').toUpperCase();
  
  if (table.startsWith('rpc/')) {
    const funcName = table.replace(/^rpc\//, '');
    const body = options.body ? JSON.parse(options.body) : {};
    
    const builder = new SupabasePostgresRpcBuilder(funcName, body, sql);
    const result = await builder.execute();
    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const builder = new SupabasePostgresQueryBuilder(table, sql);
  
  const select = urlObj.searchParams.get('select') || '*';
  builder.select(select);
  
  const limit = urlObj.searchParams.get('limit');
  if (limit) builder.limit(parseInt(limit, 10));
  
  const order = urlObj.searchParams.get('order');
  if (order) {
    const [col, dir] = order.split('.');
    builder.order(col, { ascending: dir !== 'desc' });
  }
  
  for (const [key, val] of urlObj.searchParams.entries()) {
    if (key === 'select' || key === 'limit' || key === 'order') continue;
    const match = val.match(/^([a-z]+)\.(.*)$/);
    if (match) {
      const op = match[1];
      let filterVal = match[2];
      
      if (op === 'eq') builder.eq(key, filterVal);
      else if (op === 'neq') builder.neq(key, filterVal);
      else if (op === 'gt') builder.gt(key, filterVal);
      else if (op === 'gte') builder.gte(key, filterVal);
      else if (op === 'lt') builder.lt(key, filterVal);
      else if (op === 'lte') builder.lte(key, filterVal);
      else if (op === 'like') builder.like(key, filterVal);
      else if (op === 'ilike') builder.ilike(key, filterVal);
      else if (op === 'is') {
        if (filterVal === 'null') builder.is(key, null);
        else if (filterVal === 'true') builder.is(key, true);
        else if (filterVal === 'false') builder.is(key, false);
      }
      else if (op === 'in') {
        const vals = filterVal.replace(/^\(|\)$/g, '').split(',').map(v => {
          let clean = v.trim();
          if (clean.startsWith('"') && clean.endsWith('"')) clean = clean.slice(1, -1);
          return clean;
        });
        builder.in(key, vals);
      }
    }
  }
  
  const preferHeader = options.headers?.['Prefer'] || options.headers?.['prefer'] || '';
  if (preferHeader.includes('count=exact')) {
    builder.countOption = 'exact';
  }
  
  if (method === 'GET') {
    const result = await builder.execute();
    const headers = { 'Content-Type': 'application/json' };
    if (result.count !== null) {
      headers['content-range'] = `0-${(result.data?.length || 1) - 1}/${result.count}`;
    }
    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers
    });
  }
  
  if (method === 'POST') {
    const body = options.body ? JSON.parse(options.body) : {};
    builder.insert(body);
    const result = await builder.execute();
    return new Response(JSON.stringify(result.data), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (method === 'PATCH') {
    const body = options.body ? JSON.parse(options.body) : {};
    builder.update(body);
    const result = await builder.execute();
    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (method === 'DELETE') {
    builder.delete();
    const result = await builder.execute();
    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  throw new Error(`Unsupported mock fetch method: ${method}`);
}

const originalFetch = globalThis.fetch;
globalThis.fetch = async function(url, options) {
  const urlStr = typeof url === 'string' ? url : url?.url || '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (supabaseUrl && urlStr.startsWith(`${supabaseUrl}/rest/v1/`)) {
    try {
      // console.log(`[Mock Fetch Interceptor] Intercepted call to: ${urlStr}`);
      return await executeMockPostgrest(urlStr, options);
    } catch (err) {
      console.error("[Fetch Interceptor Error] Failed, falling back to original fetch:", err);
    }
  }
  
  return originalFetch.apply(this, arguments);
};

