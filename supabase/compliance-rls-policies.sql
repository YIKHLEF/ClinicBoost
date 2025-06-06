-- Row Level Security Policies for Compliance Features
-- Run this AFTER the compliance-features migration

-- Helper function to check if user is admin or has compliance role
CREATE OR REPLACE FUNCTION is_compliance_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role IN ('admin', 'compliance_officer') 
        FROM users 
        WHERE id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Consent Records Policies
CREATE POLICY "Users can view their own consent records" ON consent_records
    FOR SELECT USING (
        auth.uid() = user_id OR 
        is_compliance_admin(auth.uid())
    );

CREATE POLICY "Users can insert their own consent records" ON consent_records
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consent records" ON consent_records
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        is_compliance_admin(auth.uid())
    );

CREATE POLICY "Only compliance admins can delete consent records" ON consent_records
    FOR DELETE USING (is_compliance_admin(auth.uid()));

-- Data Subject Requests Policies
CREATE POLICY "Users can view their own data subject requests" ON data_subject_requests
    FOR SELECT USING (
        auth.uid() = user_id OR 
        is_compliance_admin(auth.uid())
    );

CREATE POLICY "Anyone can insert data subject requests" ON data_subject_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Only compliance admins can update data subject requests" ON data_subject_requests
    FOR UPDATE USING (is_compliance_admin(auth.uid()));

CREATE POLICY "Only compliance admins can delete data subject requests" ON data_subject_requests
    FOR DELETE USING (is_compliance_admin(auth.uid()));

-- Compliance Audit Logs Policies
CREATE POLICY "Compliance admins can view all audit logs" ON compliance_audit_logs
    FOR SELECT USING (is_compliance_admin(auth.uid()));

CREATE POLICY "System can insert audit logs" ON compliance_audit_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Only compliance admins can update audit logs" ON compliance_audit_logs
    FOR UPDATE USING (is_compliance_admin(auth.uid()));

CREATE POLICY "Only compliance admins can delete audit logs" ON compliance_audit_logs
    FOR DELETE USING (is_compliance_admin(auth.uid()));

-- Data Retention Policies
CREATE POLICY "Compliance admins can manage retention policies" ON data_retention_policies
    FOR ALL USING (is_compliance_admin(auth.uid()));

CREATE POLICY "All authenticated users can view active retention policies" ON data_retention_policies
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Data Retention Jobs Policies
CREATE POLICY "Compliance admins can manage retention jobs" ON data_retention_jobs
    FOR ALL USING (is_compliance_admin(auth.uid()));

-- Privacy Settings Policies
CREATE POLICY "Users can view their own privacy settings" ON privacy_settings
    FOR SELECT USING (
        auth.uid() = user_id OR 
        is_compliance_admin(auth.uid())
    );

CREATE POLICY "Users can manage their own privacy settings" ON privacy_settings
    FOR ALL USING (
        auth.uid() = user_id OR 
        is_compliance_admin(auth.uid())
    );

-- Compliance Reports Policies
CREATE POLICY "Compliance admins can manage compliance reports" ON compliance_reports
    FOR ALL USING (is_compliance_admin(auth.uid()));

-- Functions for compliance operations

-- Function to log compliance events
CREATE OR REPLACE FUNCTION log_compliance_event(
    p_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT,
    p_old_data JSONB DEFAULT NULL,
    p_new_data JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_compliance_flags TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO compliance_audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        old_data,
        new_data,
        ip_address,
        user_agent,
        compliance_flags,
        retention_date
    ) VALUES (
        p_user_id,
        p_action,
        p_resource_type,
        p_resource_id,
        p_old_data,
        p_new_data,
        p_ip_address,
        p_user_agent,
        p_compliance_flags,
        NOW() + INTERVAL '7 years' -- Default 7-year retention for compliance logs
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record consent
CREATE OR REPLACE FUNCTION record_consent(
    p_user_id UUID,
    p_patient_id UUID,
    p_consent_type consent_type,
    p_status consent_status,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_consent_text TEXT DEFAULT NULL,
    p_version TEXT DEFAULT '1.0'
)
RETURNS UUID AS $$
DECLARE
    consent_id UUID;
BEGIN
    -- Withdraw any existing consent of the same type
    UPDATE consent_records 
    SET status = 'withdrawn', 
        withdrawn_at = NOW(),
        updated_at = NOW()
    WHERE (user_id = p_user_id OR patient_id = p_patient_id)
      AND consent_type = p_consent_type
      AND status = 'granted';
    
    -- Insert new consent record
    INSERT INTO consent_records (
        user_id,
        patient_id,
        consent_type,
        status,
        granted_at,
        ip_address,
        user_agent,
        consent_text,
        version
    ) VALUES (
        p_user_id,
        p_patient_id,
        p_consent_type,
        p_status,
        CASE WHEN p_status = 'granted' THEN NOW() ELSE NULL END,
        p_ip_address,
        p_user_agent,
        p_consent_text,
        p_version
    ) RETURNING id INTO consent_id;
    
    -- Log the consent action
    PERFORM log_compliance_event(
        COALESCE(p_user_id, auth.uid()),
        'consent_' || p_status::text,
        'consent',
        consent_id::text,
        NULL,
        jsonb_build_object(
            'consent_type', p_consent_type,
            'status', p_status,
            'version', p_version
        ),
        p_ip_address,
        p_user_agent,
        ARRAY['gdpr', 'consent_management']
    );
    
    RETURN consent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if consent is granted
CREATE OR REPLACE FUNCTION has_consent(
    p_user_id UUID,
    p_patient_id UUID,
    p_consent_type consent_type
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM consent_records
        WHERE (user_id = p_user_id OR patient_id = p_patient_id)
          AND consent_type = p_consent_type
          AND status = 'granted'
          AND withdrawn_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to anonymize patient data
CREATE OR REPLACE FUNCTION anonymize_patient_data(p_patient_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update patient record with anonymized data
    UPDATE patients 
    SET 
        first_name = 'Anonymous',
        last_name = 'Patient',
        email = NULL,
        phone = 'REDACTED',
        address = 'REDACTED',
        city = 'REDACTED',
        insurance_provider = 'REDACTED',
        insurance_number = 'REDACTED',
        medical_history = '{"anonymized": true}',
        notes = 'Data anonymized per retention policy',
        updated_at = NOW()
    WHERE id = p_patient_id;
    
    -- Log the anonymization
    PERFORM log_compliance_event(
        auth.uid(),
        'anonymize',
        'patient',
        p_patient_id::text,
        NULL,
        jsonb_build_object('anonymized', true),
        NULL,
        NULL,
        ARRAY['gdpr', 'data_retention', 'anonymization']
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
