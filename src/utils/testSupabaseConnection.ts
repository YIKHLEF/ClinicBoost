// Test Supabase connection and basic functionality
import { supabase } from '../lib/supabase';

export const testSupabaseConnection = async () => {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    // Test 1: Basic connection
    console.log('1. Testing basic connection...');
    const { data, error } = await supabase.from('treatments').select('count');
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Basic connection successful');
    
    // Test 2: Check if tables exist
    console.log('2. Checking database tables...');
    const tables = ['users', 'patients', 'appointments', 'treatments', 'invoices'];
    
    for (const table of tables) {
      try {
        const { error: tableError } = await supabase.from(table).select('*').limit(1);
        if (tableError) {
          console.error(`❌ Table '${table}' not accessible:`, tableError.message);
        } else {
          console.log(`✅ Table '${table}' accessible`);
        }
      } catch (err) {
        console.error(`❌ Error checking table '${table}':`, err);
      }
    }
    
    // Test 3: Test authentication
    console.log('3. Testing authentication...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('❌ Auth test failed:', authError.message);
    } else {
      console.log('✅ Authentication system accessible');
      console.log('Current session:', authData.session ? 'Logged in' : 'Not logged in');
    }
    
    // Test 4: Test treatments data
    console.log('4. Testing sample data...');
    const { data: treatmentsData, error: treatmentsError } = await supabase
      .from('treatments')
      .select('*')
      .limit(5);
    
    if (treatmentsError) {
      console.error('❌ Sample data test failed:', treatmentsError.message);
    } else {
      console.log(`✅ Found ${treatmentsData?.length || 0} treatments in database`);
      if (treatmentsData && treatmentsData.length > 0) {
        console.log('Sample treatment:', treatmentsData[0].name);
      }
    }
    
    console.log('🎉 Supabase connection test completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error during connection test:', error);
    return false;
  }
};

// Test user registration
export const testUserRegistration = async (email: string, password: string, userData: any) => {
  console.log('🔍 Testing user registration...');
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    });
    
    if (error) {
      console.error('❌ Registration failed:', error.message);
      return false;
    }
    
    console.log('✅ User registration successful');
    console.log('User ID:', data.user?.id);
    console.log('Email confirmation required:', !data.user?.email_confirmed_at);
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error during registration:', error);
    return false;
  }
};

// Test user login
export const testUserLogin = async (email: string, password: string) => {
  console.log('🔍 Testing user login...');
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('❌ Login failed:', error.message);
      return false;
    }
    
    console.log('✅ User login successful');
    console.log('User ID:', data.user?.id);
    console.log('Email:', data.user?.email);
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error during login:', error);
    return false;
  }
};

// Test patient creation
export const testPatientCreation = async () => {
  console.log('🔍 Testing patient creation...');
  
  try {
    const testPatient = {
      first_name: 'Test',
      last_name: 'Patient',
      email: 'test.patient@example.com',
      phone: '+212612345678',
      date_of_birth: '1990-01-01',
      gender: 'male',
      address: '123 Test Street',
      city: 'Casablanca',
      medical_history: {
        allergies: ['Penicillin'],
        medications: [],
        conditions: [],
        notes: 'Test patient for system verification'
      },
      notes: 'This is a test patient created during setup verification'
    };
    
    const { data, error } = await supabase
      .from('patients')
      .insert(testPatient)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Patient creation failed:', error.message);
      return false;
    }
    
    console.log('✅ Patient creation successful');
    console.log('Patient ID:', data.id);
    console.log('Patient name:', `${data.first_name} ${data.last_name}`);
    
    // Clean up - delete the test patient
    await supabase.from('patients').delete().eq('id', data.id);
    console.log('✅ Test patient cleaned up');
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error during patient creation:', error);
    return false;
  }
};

// Run all tests
export const runAllTests = async () => {
  console.log('🚀 Starting comprehensive Supabase tests...\n');
  
  const results = {
    connection: false,
    patientCreation: false
  };
  
  // Test connection
  results.connection = await testSupabaseConnection();
  console.log('');
  
  // Test patient creation (only if connection works)
  if (results.connection) {
    results.patientCreation = await testPatientCreation();
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log('Connection:', results.connection ? '✅ PASS' : '❌ FAIL');
  console.log('Patient Creation:', results.patientCreation ? '✅ PASS' : '❌ FAIL');
  
  const allPassed = Object.values(results).every(result => result);
  console.log('\nOverall Status:', allPassed ? '🎉 ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED');
  
  return results;
};
