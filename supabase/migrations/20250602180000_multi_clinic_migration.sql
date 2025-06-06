/*
  # Multi-Clinic Migration Script
  
  This migration script helps migrate existing single-clinic data to the new multi-clinic structure.
  
  Steps:
  1. Create a default clinic for existing data
  2. Update existing patients and appointments to reference the default clinic
  3. Create clinic memberships for existing users
*/

-- Create a default clinic for existing data
DO $$
DECLARE
    default_clinic_id uuid;
    admin_user_id uuid;
BEGIN
    -- Get the first admin user to be the clinic owner
    SELECT id INTO admin_user_id 
    FROM users 
    WHERE role = 'admin' 
    LIMIT 1;
    
    -- If no admin user exists, get the first user
    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id 
        FROM users 
        LIMIT 1;
    END IF;
    
    -- Only proceed if we have at least one user
    IF admin_user_id IS NOT NULL THEN
        -- Create default clinic
        INSERT INTO clinics (
            id,
            name,
            type,
            description,
            address,
            city,
            country,
            phone,
            email,
            owner_id,
            created_by,
            updated_by
        ) VALUES (
            uuid_generate_v4(),
            'Default Clinic',
            'general',
            'Default clinic created during migration',
            '123 Main Street',
            'Default City',
            'Morocco',
            '+212 5-00-000000',
            'contact@defaultclinic.com',
            admin_user_id,
            admin_user_id,
            admin_user_id
        ) RETURNING id INTO default_clinic_id;
        
        -- Update existing patients to reference the default clinic
        UPDATE patients 
        SET clinic_id = default_clinic_id 
        WHERE clinic_id IS NULL;
        
        -- Update existing appointments to reference the default clinic
        UPDATE appointments 
        SET clinic_id = default_clinic_id 
        WHERE clinic_id IS NULL;
        
        -- Create clinic memberships for all existing users
        INSERT INTO clinic_memberships (
            user_id,
            clinic_id,
            role,
            permissions,
            is_active,
            created_by,
            updated_by
        )
        SELECT 
            u.id,
            default_clinic_id,
            u.role,
            '{}',
            true,
            admin_user_id,
            admin_user_id
        FROM users u
        WHERE NOT EXISTS (
            SELECT 1 FROM clinic_memberships cm 
            WHERE cm.user_id = u.id AND cm.clinic_id = default_clinic_id
        );
        
        -- Update users to set default clinic
        UPDATE users 
        SET default_clinic_id = default_clinic_id 
        WHERE default_clinic_id IS NULL;
        
        RAISE NOTICE 'Migration completed successfully. Default clinic created with ID: %', default_clinic_id;
    ELSE
        RAISE NOTICE 'No users found. Skipping migration.';
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_memberships_user_clinic ON clinic_memberships(user_id, clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_memberships_clinic_active ON clinic_memberships(clinic_id, is_active);
CREATE INDEX IF NOT EXISTS idx_clinic_resources_clinic_type ON clinic_resources(clinic_id, type);
CREATE INDEX IF NOT EXISTS idx_clinic_resources_shareable ON clinic_resources(is_shareable, is_available);
CREATE INDEX IF NOT EXISTS idx_resource_sharing_status ON resource_sharing(status);
CREATE INDEX IF NOT EXISTS idx_resource_sharing_clinics ON resource_sharing(requesting_clinic_id, providing_clinic_id);

-- Add foreign key constraints that might have been missed
ALTER TABLE patients 
ADD CONSTRAINT fk_patients_clinic 
FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE appointments 
ADD CONSTRAINT fk_appointments_clinic 
FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

-- Add check constraints for data integrity
ALTER TABLE clinic_resources 
ADD CONSTRAINT chk_cost_positive 
CHECK (cost_per_hour IS NULL OR cost_per_hour >= 0);

ALTER TABLE clinic_resources 
ADD CONSTRAINT chk_cost_per_use_positive 
CHECK (cost_per_use IS NULL OR cost_per_use >= 0);

ALTER TABLE resource_sharing 
ADD CONSTRAINT chk_sharing_cost_positive 
CHECK (cost IS NULL OR cost >= 0);

ALTER TABLE resource_sharing 
ADD CONSTRAINT chk_sharing_time_valid 
CHECK (end_time > start_time);

-- Create a function to automatically set clinic_id for new records
CREATE OR REPLACE FUNCTION set_default_clinic_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If clinic_id is not set, try to get it from the user's default clinic
    IF NEW.clinic_id IS NULL THEN
        SELECT default_clinic_id INTO NEW.clinic_id
        FROM users 
        WHERE id = auth.uid();
        
        -- If still null, get the first clinic the user belongs to
        IF NEW.clinic_id IS NULL THEN
            SELECT clinic_id INTO NEW.clinic_id
            FROM clinic_memberships 
            WHERE user_id = auth.uid() AND is_active = true
            LIMIT 1;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically set clinic_id
CREATE TRIGGER set_patient_clinic_id
    BEFORE INSERT ON patients
    FOR EACH ROW
    EXECUTE FUNCTION set_default_clinic_id();

CREATE TRIGGER set_appointment_clinic_id
    BEFORE INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION set_default_clinic_id();

-- Add comments for documentation
COMMENT ON TABLE clinics IS 'Stores clinic information for multi-clinic support';
COMMENT ON TABLE clinic_memberships IS 'Many-to-many relationship between users and clinics with roles';
COMMENT ON TABLE clinic_resources IS 'Resources available at each clinic (equipment, rooms, staff, etc.)';
COMMENT ON TABLE resource_sharing IS 'Cross-clinic resource sharing requests and approvals';

COMMENT ON COLUMN clinics.type IS 'Type of dental practice (general, orthodontics, oral_surgery, etc.)';
COMMENT ON COLUMN clinic_resources.is_shareable IS 'Whether this resource can be shared with other clinics';
COMMENT ON COLUMN resource_sharing.status IS 'Status of the sharing request (requested, approved, in_use, etc.)';

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON clinics TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON clinic_memberships TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON clinic_resources TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON resource_sharing TO authenticated;
