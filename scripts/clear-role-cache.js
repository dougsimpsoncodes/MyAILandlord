// Run this in your browser console to clear the cached role
// This will force the app to reload and check your actual role from the database

// Clear the role from AsyncStorage/localStorage
localStorage.removeItem('@MyAILandlord:userRole');

// Clear all MyAILandlord related storage
Object.keys(localStorage).forEach(key => {
  if (key.includes('MyAILandlord')) {
    localStorage.removeItem(key);
    console.log('Cleared:', key);
  }
});

console.log('✅ Role cache cleared! Refresh the page to reload with your actual database role.');
console.log('The app should now show you as a tenant based on your database profile.');