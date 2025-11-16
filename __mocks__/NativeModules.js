// Minimal NativeModules mock to satisfy jest-expo setup
const nativeModules = {
  UIManager: {},
  Linking: {},
  NativeUnimoduleProxy: { viewManagersMetadata: {} },
};
module.exports = nativeModules;
module.exports.default = nativeModules;
