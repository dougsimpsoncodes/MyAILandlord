// Basic globals to prevent environment-sensitive crashes
if (typeof global.window !== 'object') {
  global.window = global;
}
if (!global.window.navigator) {
  global.window.navigator = {};
}

