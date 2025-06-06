# Multi-Clinic Support Implementation

This document describes the comprehensive multi-clinic support feature implemented in ClinicBoost, enabling management of multiple dental practices and cross-clinic resource sharing.

## 🏗️ Architecture Overview

### Database Schema

The multi-clinic support is built on four core tables:

1. **`clinics`** - Stores clinic information
2. **`clinic_memberships`** - Many-to-many relationship between users and clinics
3. **`clinic_resources`** - Resources available at each clinic
4. **`resource_sharing`** - Cross-clinic resource sharing requests

### Key Features

- ✅ **Multi-Clinic Management**: Create and manage multiple clinic locations
- ✅ **User Clinic Memberships**: Users can belong to multiple clinics with different roles
- ✅ **Clinic Switching**: Easy switching between clinics in the UI
- ✅ **Resource Management**: Manage equipment, rooms, staff, materials, and services
- ✅ **Cross-Clinic Resource Sharing**: Share resources between clinics
- ✅ **Role-Based Access Control**: Clinic-specific permissions and roles
- ✅ **Data Isolation**: Clinic-specific data filtering for patients, appointments, etc.

## 🚀 Getting Started

### 1. Database Migration

Run the migration scripts to set up the multi-clinic schema:

```sql
-- Run the initial schema migration
\i supabase/migrations/20250602175134_restless_water.sql

-- Run the multi-clinic migration (creates default clinic for existing data)
\i supabase/migrations/20250602180000_multi_clinic_migration.sql
```

### 2. Frontend Integration

The multi-clinic support is automatically integrated into the existing ClinicBoost application:

- **Clinic Context**: Manages current clinic selection and user permissions
- **Clinic Switcher**: UI component for switching between clinics
- **Updated APIs**: All existing APIs are now clinic-aware
- **New Pages**: Clinic Management and Resource Sharing pages

### 3. User Experience

1. **Login**: Users see their available clinics after authentication
2. **Clinic Selection**: Default clinic is selected automatically
3. **Clinic Switching**: Users can switch between clinics using the clinic switcher
4. **Data Filtering**: All data (patients, appointments, etc.) is filtered by current clinic
5. **Resource Sharing**: Users can browse and request resources from other clinics

## 📊 Database Schema Details

### Clinics Table

```sql
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
  updated_at timestamptz DEFAULT now()
);
```

### Clinic Memberships Table

```sql
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
  UNIQUE(user_id, clinic_id)
);
```

### Clinic Resources Table

```sql
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
  updated_at timestamptz DEFAULT now()
);
```

### Resource Sharing Table

```sql
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
```

## 🔧 API Usage

### Clinic Management

```typescript
import { clinicService } from '../lib/clinic-management/clinic-service';

// Get user's clinics
const clinics = await clinicService.getUserClinics(userId);

// Create a new clinic
const newClinic = await clinicService.createClinic({
  name: 'New Dental Clinic',
  type: 'general',
  address: '123 Main St',
  city: 'Casablanca',
  phone: '+212 5-22-123456',
  email: 'contact@newclinic.com'
}, ownerId);

// Add member to clinic
await clinicService.addClinicMember(clinicId, userId, 'dentist');
```

### Resource Management

```typescript
import { resourceService } from '../lib/clinic-management/resource-service';

// Get clinic resources
const resources = await resourceService.getClinicResources(clinicId);

// Create a resource
const newResource = await resourceService.createResource({
  clinic_id: clinicId,
  name: 'Digital X-Ray Machine',
  type: 'equipment',
  description: 'High-resolution digital X-ray system',
  is_shareable: true,
  cost_per_use: 50.00
}, userId);

// Request resource sharing
await resourceService.createSharingRequest({
  resource_id: resourceId,
  requesting_clinic_id: clinicId,
  start_time: '2024-01-15T09:00:00Z',
  end_time: '2024-01-15T17:00:00Z',
  notes: 'Need for emergency patient'
}, userId);
```

## 🎨 UI Components

### Clinic Switcher

```tsx
import { ClinicSwitcher } from '../components/clinic/ClinicSwitcher';

<ClinicSwitcher 
  showCreateButton={true}
  onCreateClinic={() => setShowCreateModal(true)}
  onManageClinic={() => navigate('/clinic-management')}
/>
```

### Clinic Management Dashboard

```tsx
import { ClinicManagement } from '../components/clinic/ClinicManagement';

<ClinicManagement />
```

### Resource Sharing Interface

```tsx
import { ResourceSharing } from '../components/clinic/ResourceSharing';

<ResourceSharing mode="browse" />
```

## 🔐 Security & Permissions

### Row Level Security (RLS)

All tables have RLS policies that ensure:
- Users can only access clinics they belong to
- Clinic data is properly isolated
- Resource sharing is controlled by clinic membership

### Role-Based Access

- **Admin**: Full clinic management, can manage members and resources
- **Dentist**: Can manage resources and approve sharing requests
- **Staff**: Can view resources and create sharing requests
- **Billing**: Limited access to clinic data

## 🚀 Migration Guide

### For Existing Installations

1. **Backup your database** before running migrations
2. Run the schema migration to add new tables
3. Run the data migration to create default clinic and update existing records
4. Update your application code to use the new clinic-aware APIs
5. Test the clinic switching functionality

### For New Installations

The multi-clinic support is included by default. Simply:
1. Run the migrations
2. Create your first clinic during onboarding
3. Start using the multi-clinic features

## 📈 Performance Considerations

- **Indexes**: Proper indexes are created for clinic-based queries
- **Query Optimization**: APIs filter by clinic_id early in the query
- **Caching**: React Query caching is clinic-aware
- **Real-time Updates**: Supabase subscriptions are filtered by clinic

## 🔮 Future Enhancements

- **Clinic Analytics**: Cross-clinic performance comparisons
- **Resource Scheduling**: Advanced booking system for shared resources
- **Billing Integration**: Cross-clinic billing and cost allocation
- **Mobile App**: Dedicated mobile interface for clinic management
- **API Integrations**: Connect with external practice management systems

## 🐛 Troubleshooting

### Common Issues

1. **Data not showing**: Ensure user has clinic membership
2. **Permission errors**: Check user role in clinic_memberships
3. **Migration issues**: Verify all foreign key constraints
4. **Performance**: Check if proper indexes are created

### Debug Queries

```sql
-- Check user's clinic memberships
SELECT c.name, cm.role, cm.is_active 
FROM clinic_memberships cm
JOIN clinics c ON c.id = cm.clinic_id
WHERE cm.user_id = 'user-id';

-- Check clinic data isolation
SELECT COUNT(*) FROM patients WHERE clinic_id = 'clinic-id';
```

## 📞 Support

For questions or issues with multi-clinic support:
1. Check this documentation
2. Review the code examples
3. Check the database schema
4. Contact the development team
