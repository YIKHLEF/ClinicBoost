// Debug script for anonymization
console.log('Testing anonymization...');

// Test age calculation
const testAge = (dateOfBirth) => {
  try {
    const birth = new Date(dateOfBirth);
    if (isNaN(birth.getTime())) {
      return '[GENERALIZED_AGE]';
    }
    
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    // Adjust age if birthday hasn't occurred this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    if (age < 18) return '0-17';
    if (age < 30) return '18-29';
    if (age < 50) return '30-49';
    if (age < 70) return '50-69';
    return '70+';
  } catch (error) {
    return '[GENERALIZED_AGE]';
  }
};

// Test cost calculation
const testCost = (cost) => {
  if (typeof cost !== 'number' || isNaN(cost)) {
    return '[GENERALIZED_COST]';
  }
  
  if (cost < 100) return '$0-99';
  if (cost < 500) return '$100-499';
  if (cost < 1000) return '$500-999';
  if (cost < 2000) return '$1000-1999';
  return '$2000+';
};

console.log('Age tests:');
console.log('1985-03-15:', testAge('1985-03-15'));
console.log('2010-01-01:', testAge('2010-01-01'));
console.log('2000-01-01:', testAge('2000-01-01'));
console.log('1980-01-01:', testAge('1980-01-01'));
console.log('1960-01-01:', testAge('1960-01-01'));
console.log('1940-01-01:', testAge('1940-01-01'));

console.log('\nCost tests:');
console.log('50:', testCost(50));
console.log('250:', testCost(250));
console.log('750:', testCost(750));
console.log('1200:', testCost(1200));
console.log('1500:', testCost(1500));
console.log('2500:', testCost(2500));
