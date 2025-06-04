-- Row Level Security Policies for ClinicBoost
-- Run this AFTER the main schema

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
BEGIN
    RETURN (SELECT role FROM users WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can insert users" ON users
    FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update all users" ON users
    FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

-- Patients table policies
CREATE POLICY "All authenticated users can view patients" ON patients
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff and above can insert patients" ON patients
    FOR INSERT WITH CHECK (
        get_user_role(auth.uid()) IN ('admin', 'dentist', 'staff')
    );

CREATE POLICY "Staff and above can update patients" ON patients
    FOR UPDATE USING (
        get_user_role(auth.uid()) IN ('admin', 'dentist', 'staff')
    );

CREATE POLICY "Only admins can delete patients" ON patients
    FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

-- Appointments table policies
CREATE POLICY "All authenticated users can view appointments" ON appointments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff and above can insert appointments" ON appointments
    FOR INSERT WITH CHECK (
        get_user_role(auth.uid()) IN ('admin', 'dentist', 'staff')
    );

CREATE POLICY "Staff and above can update appointments" ON appointments
    FOR UPDATE USING (
        get_user_role(auth.uid()) IN ('admin', 'dentist', 'staff')
    );

CREATE POLICY "Dentists and admins can delete appointments" ON appointments
    FOR DELETE USING (
        get_user_role(auth.uid()) IN ('admin', 'dentist')
    );

-- Treatments table policies
CREATE POLICY "All authenticated users can view treatments" ON treatments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and dentists can manage treatments" ON treatments
    FOR ALL USING (
        get_user_role(auth.uid()) IN ('admin', 'dentist')
    );

-- Invoices table policies
CREATE POLICY "All authenticated users can view invoices" ON invoices
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff and above can insert invoices" ON invoices
    FOR INSERT WITH CHECK (
        get_user_role(auth.uid()) IN ('admin', 'dentist', 'staff', 'billing')
    );

CREATE POLICY "Staff and above can update invoices" ON invoices
    FOR UPDATE USING (
        get_user_role(auth.uid()) IN ('admin', 'dentist', 'staff', 'billing')
    );

CREATE POLICY "Admins and billing can delete invoices" ON invoices
    FOR DELETE USING (
        get_user_role(auth.uid()) IN ('admin', 'billing')
    );

-- Invoice items table policies
CREATE POLICY "All authenticated users can view invoice items" ON invoice_items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff and above can manage invoice items" ON invoice_items
    FOR ALL USING (
        get_user_role(auth.uid()) IN ('admin', 'dentist', 'staff', 'billing')
    );

-- Payments table policies
CREATE POLICY "All authenticated users can view payments" ON payments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Billing staff and above can manage payments" ON payments
    FOR ALL USING (
        get_user_role(auth.uid()) IN ('admin', 'billing')
    );

-- Campaigns table policies
CREATE POLICY "All authenticated users can view campaigns" ON campaigns
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff and above can manage campaigns" ON campaigns
    FOR ALL USING (
        get_user_role(auth.uid()) IN ('admin', 'dentist', 'staff')
    );

-- Campaign messages table policies
CREATE POLICY "All authenticated users can view campaign messages" ON campaign_messages
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff and above can manage campaign messages" ON campaign_messages
    FOR ALL USING (
        get_user_role(auth.uid()) IN ('admin', 'dentist', 'staff')
    );

-- Function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO users (id, first_name, last_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'Unknown'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'staff')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    invoice_number TEXT;
BEGIN
    -- Get the next invoice number
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1
    INTO next_number
    FROM invoices
    WHERE invoice_number LIKE 'INV-%';
    
    -- Format as INV-XXXX
    invoice_number := 'INV-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update invoice totals
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    invoice_subtotal DECIMAL(10,2);
    invoice_tax DECIMAL(10,2);
    invoice_total DECIMAL(10,2);
BEGIN
    -- Calculate totals for the invoice
    SELECT 
        COALESCE(SUM(total_price), 0),
        COALESCE(SUM(total_price), 0) * 0.20, -- 20% tax rate
        COALESCE(SUM(total_price), 0) * 1.20  -- Total with tax
    INTO invoice_subtotal, invoice_tax, invoice_total
    FROM invoice_items
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Update the invoice
    UPDATE invoices
    SET 
        subtotal = invoice_subtotal,
        tax_amount = invoice_tax,
        total_amount = invoice_total,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update invoice totals when items change
CREATE TRIGGER update_invoice_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW EXECUTE FUNCTION update_invoice_totals();

-- Function to set invoice number on insert
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number := generate_invoice_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set invoice number
CREATE TRIGGER set_invoice_number_trigger
    BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION set_invoice_number();
