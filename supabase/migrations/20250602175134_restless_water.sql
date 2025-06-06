/*
  # Initial Schema Setup for ClinicBoost

  1. New Tables
    - users (extends Supabase auth)
      - role (admin, dentist, staff, billing)
      - profile data
      - audit fields
    
    - patients
      - personal information
      - contact details
      - insurance information
      - audit fields
    
    - appointments
      - scheduling details
      - patient and dentist references
      - status tracking
      - audit fields
    
    - treatments
      - treatment details
      - cost information
      - audit fields
    
    - invoices
      - billing information
      - payment status
      - audit fields
    
    - campaigns
      - marketing campaign details
      - targeting information
      - performance metrics
    
  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access
    - Implement audit logging
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'dentist', 'staff', 'billing');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'completed', 'refunded');
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'active', 'completed', 'paused');
CREATE TYPE clinic_type AS ENUM ('general', 'orthodontics', 'oral_surgery', 'pediatric', 'cosmetic', 'periodontics', 'endodontics');
CREATE TYPE resource_type AS ENUM ('equipment', 'room', 'staff', 'material', 'service');
CREATE TYPE sharing_status AS ENUM ('available', 'requested', 'approved', 'in_use', 'returned', 'declined');

-- Create clinics table
CREATE TABLE clinics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type clinic_type NOT NULL DEFAULT 'general',
  description text,
  address text NOT NULL,
  city text NOT NULL,
  postal_code text,
  country text DEFAULT 'Morocco',
  phone text NOT NULL,
  email text NOT NULL,
  website text,
  logo_url text,
  license_number text,
  tax_id text,
  settings jsonb DEFAULT '{}',
  working_hours jsonb DEFAULT '{}',
  timezone text DEFAULT 'Africa/Casablanca',
  is_active boolean DEFAULT true,
  owner_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Create users table (extends auth.users)
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  role user_role NOT NULL DEFAULT 'staff',
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  avatar_url text,
  default_clinic_id uuid REFERENCES clinics(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create clinic memberships table (many-to-many relationship between users and clinics)
CREATE TABLE clinic_memberships (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'staff',
  permissions jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id),
  UNIQUE(user_id, clinic_id)
);

-- Create patients table
CREATE TABLE patients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text NOT NULL,
  date_of_birth date,
  gender text,
  address text,
  city text,
  insurance_provider text,
  insurance_number text,
  medical_history jsonb DEFAULT '{}',
  notes text,
  status text DEFAULT 'active',
  risk_level text DEFAULT 'low',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id)
);

-- Create appointments table
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  dentist_id uuid REFERENCES users(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status appointment_status DEFAULT 'scheduled',
  treatment_id uuid,
  notes text,
  reminder_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id)
);

-- Create treatments table
CREATE TABLE treatments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  cost decimal(10,2) NOT NULL,
  status text DEFAULT 'planned',
  start_date date,
  completion_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id)
);

-- Create invoices table
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  treatment_id uuid REFERENCES treatments(id),
  amount decimal(10,2) NOT NULL,
  status payment_status DEFAULT 'pending',
  due_date date NOT NULL,
  payment_method text,
  stripe_payment_intent_id text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id)
);

-- Create campaigns table
CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  type text NOT NULL,
  status campaign_status DEFAULT 'draft',
  start_date timestamptz,
  end_date timestamptz,
  target_criteria jsonb DEFAULT '{}',
  message_template jsonb NOT NULL,
  metrics jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id)
);

-- Create clinic resources table
CREATE TABLE clinic_resources (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  type resource_type NOT NULL,
  description text,
  specifications jsonb DEFAULT '{}',
  location text,
  capacity integer,
  cost_per_hour decimal(10,2),
  cost_per_use decimal(10,2),
  availability_schedule jsonb DEFAULT '{}',
  maintenance_schedule jsonb DEFAULT '{}',
  is_available boolean DEFAULT true,
  is_shareable boolean DEFAULT false,
  sharing_terms text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id)
);

-- Create resource sharing table
CREATE TABLE resource_sharing (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id uuid REFERENCES clinic_resources(id) ON DELETE CASCADE,
  requesting_clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  providing_clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status sharing_status DEFAULT 'requested',
  cost decimal(10,2),
  terms text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  returned_at timestamptz
);

-- Create audit_logs table
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_sharing ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for clinics table
CREATE POLICY "Users can view clinics they belong to"
  ON clinics FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT clinic_id FROM clinic_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR owner_id = auth.uid()
  );

CREATE POLICY "Clinic owners can manage their clinics"
  ON clinics FOR ALL
  TO authenticated
  USING (owner_id = auth.uid());

-- Create policies for clinic_memberships table
CREATE POLICY "Users can view their own memberships"
  ON clinic_memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Clinic owners and admins can manage memberships"
  ON clinic_memberships FOR ALL
  TO authenticated
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
    OR auth.uid() IN (
      SELECT user_id FROM clinic_memberships
      WHERE clinic_id = clinic_memberships.clinic_id
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Create policies for clinic_resources table
CREATE POLICY "Clinic members can view clinic resources"
  ON clinic_resources FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Clinic admins can manage resources"
  ON clinic_resources FOR ALL
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'dentist')
      AND is_active = true
    )
  );

-- Create policies for resource_sharing table
CREATE POLICY "Clinic members can view resource sharing"
  ON resource_sharing FOR SELECT
  TO authenticated
  USING (
    requesting_clinic_id IN (
      SELECT clinic_id FROM clinic_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR providing_clinic_id IN (
      SELECT clinic_id FROM clinic_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Clinic members can request resource sharing"
  ON resource_sharing FOR INSERT
  TO authenticated
  WITH CHECK (
    requesting_clinic_id IN (
      SELECT clinic_id FROM clinic_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Resource owners can manage sharing requests"
  ON resource_sharing FOR UPDATE
  TO authenticated
  USING (
    providing_clinic_id IN (
      SELECT clinic_id FROM clinic_memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'dentist')
      AND is_active = true
    )
  );

-- Create policies for users table
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

CREATE POLICY "Admins can modify users"
  ON users FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- Create policies for patients table
CREATE POLICY "Clinic members can view clinic patients"
  ON patients FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Clinic staff can create patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM clinic_memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'dentist', 'staff')
      AND is_active = true
    )
  );

CREATE POLICY "Clinic staff can update patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'dentist', 'staff')
      AND is_active = true
    )
  );

-- Create policies for appointments table
CREATE POLICY "Clinic members can view clinic appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Clinic staff can manage appointments"
  ON appointments FOR ALL
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'dentist', 'staff')
      AND is_active = true
    )
  );

-- Create policies for treatments table
CREATE POLICY "All authenticated users can view treatments"
  ON treatments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Dentists and staff can manage treatments"
  ON treatments FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role IN ('admin', 'dentist', 'staff')
    )
  );

-- Create policies for invoices table
CREATE POLICY "All authenticated users can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Billing staff can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role IN ('admin', 'billing')
    )
  );

-- Create policies for campaigns table
CREATE POLICY "All authenticated users can view campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage campaigns"
  ON campaigns FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role IN ('admin', 'staff')
    )
  );

-- Create policies for audit_logs table
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treatments_updated_at
    BEFORE UPDATE ON treatments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinics_updated_at
    BEFORE UPDATE ON clinics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinic_memberships_updated_at
    BEFORE UPDATE ON clinic_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinic_resources_updated_at
    BEFORE UPDATE ON clinic_resources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resource_sharing_updated_at
    BEFORE UPDATE ON resource_sharing
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function for audit logging
CREATE OR REPLACE FUNCTION audit_log_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_data,
        new_data
    ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create audit triggers
CREATE TRIGGER audit_patients_changes
    AFTER INSERT OR UPDATE OR DELETE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_users_changes
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_appointments_changes
    AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_treatments_changes
    AFTER INSERT OR UPDATE OR DELETE ON treatments
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_invoices_changes
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_appointments_changes
    AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_treatments_changes
    AFTER INSERT OR UPDATE OR DELETE ON treatments
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_invoices_changes
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_campaigns_changes
    AFTER INSERT OR UPDATE OR DELETE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_clinics_changes
    AFTER INSERT OR UPDATE OR DELETE ON clinics
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_clinic_memberships_changes
    AFTER INSERT OR UPDATE OR DELETE ON clinic_memberships
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_clinic_resources_changes
    AFTER INSERT OR UPDATE OR DELETE ON clinic_resources
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_resource_sharing_changes
    AFTER INSERT OR UPDATE OR DELETE ON resource_sharing
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_changes();