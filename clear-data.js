
// Data clearing utility - run this in browser console
// Clear AsyncStorage
Object.keys(localStorage).forEach(key => {
  if (key.includes('expo') || key.includes('supabase') || key.includes('clerk') || key.includes('draft')) {
    localStorage.removeItem(key);
  }
});

// Clear IndexedDB
indexedDB.databases().then(databases => {
  databases.forEach(db => {
    if (db.name) indexedDB.deleteDatabase(db.name);
  });
});

// Clear session storage
sessionStorage.clear();

console.log('All app data cleared! Refresh the page.');

