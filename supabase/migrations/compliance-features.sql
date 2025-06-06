/*
  # Compliance Features Migration
  
  This migration adds comprehensive compliance features including:
  1. GDPR/Data Privacy Controls
  2. Enhanced Audit Logging
  3. Data Retention Policies
  4. Consent Management
*/

-- Create compliance-related enums
CREATE TYPE consent_type AS ENUM ('cookies', 'analytics', 'marketing', 'data_processing', 'third_party_sharing');
CREATE TYPE consent_status AS ENUM ('granted', 'denied', 'pending', 'withdrawn');
CREATE TYPE data_subject_request_type AS ENUM ('access', 'rectification', 'erasure', 'portability', 'restriction');
CREATE TYPE request_status AS ENUM ('pending', 'in_progress', 'completed', 'rejected');
CREATE TYPE retention_action AS ENUM ('archive', 'anonymize', 'delete');

-- Consent Management Table
CREATE TABLE consent_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    consent_type consent_type NOT NULL,
    status consent_status NOT NULL DEFAULT 'pending',
    granted_at TIMESTAMP WITH TIME ZONE,
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    consent_text TEXT,
    version TEXT NOT NULL DEFAULT '1.0',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one active consent per type per user/patient
    CONSTRAINT unique_active_consent UNIQUE (user_id, patient_id, consent_type, status) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Data Subject Rights Requests
CREATE TABLE data_subject_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    request_type data_subject_request_type NOT NULL,
    requester_email TEXT NOT NULL,
    requester_name TEXT,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status request_status DEFAULT 'pending',
    description TEXT,
    verification_token TEXT UNIQUE,
    verified_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    response_data JSONB,
    notes TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Audit Logs with compliance features
CREATE TABLE compliance_audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    session_id TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    location JSONB,
    risk_level TEXT DEFAULT 'low',
    compliance_flags TEXT[],
    retention_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Retention Policies
CREATE TABLE data_retention_policies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    table_name TEXT NOT NULL,
    retention_period_days INTEGER NOT NULL,
    action retention_action NOT NULL DEFAULT 'archive',
    conditions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    legal_basis TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Retention Jobs
CREATE TABLE data_retention_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    policy_id UUID REFERENCES data_retention_policies(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    records_processed INTEGER DEFAULT 0,
    records_affected INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Privacy Settings
CREATE TABLE privacy_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE UNIQUE,
    data_processing_consent BOOLEAN DEFAULT false,
    marketing_consent BOOLEAN DEFAULT false,
    analytics_consent BOOLEAN DEFAULT false,
    third_party_sharing_consent BOOLEAN DEFAULT false,
    profile_visibility TEXT DEFAULT 'private',
    data_export_format TEXT DEFAULT 'json',
    notification_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure either user_id or patient_id is set, but not both
    CONSTRAINT check_single_entity CHECK (
        (user_id IS NOT NULL AND patient_id IS NULL) OR 
        (user_id IS NULL AND patient_id IS NOT NULL)
    )
);

-- Compliance Reports
CREATE TABLE compliance_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    parameters JSONB DEFAULT '{}',
    generated_by UUID REFERENCES users(id),
    file_path TEXT,
    file_size BIGINT,
    status TEXT DEFAULT 'generating',
    error_message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_consent_records_user_type ON consent_records(user_id, consent_type);
CREATE INDEX idx_consent_records_patient_type ON consent_records(patient_id, consent_type);
CREATE INDEX idx_consent_records_status ON consent_records(status);
CREATE INDEX idx_data_subject_requests_status ON data_subject_requests(status);
CREATE INDEX idx_data_subject_requests_email ON data_subject_requests(requester_email);
CREATE INDEX idx_compliance_audit_logs_user_id ON compliance_audit_logs(user_id);
CREATE INDEX idx_compliance_audit_logs_created_at ON compliance_audit_logs(created_at);
CREATE INDEX idx_compliance_audit_logs_resource ON compliance_audit_logs(resource_type, resource_id);
CREATE INDEX idx_data_retention_policies_table ON data_retention_policies(table_name);
CREATE INDEX idx_privacy_settings_user_id ON privacy_settings(user_id);
CREATE INDEX idx_privacy_settings_patient_id ON privacy_settings(patient_id);

-- Enable RLS on all compliance tables
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;
