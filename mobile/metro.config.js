const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Windows can exhaust its file-handle limit while Metro reads thousands of
// transform cache entries concurrently. One worker without the persistent
// transform cache keeps physical-device development stable for this project.
config.maxWorkers = 1;
config.cacheStores = [];

module.exports = config;
