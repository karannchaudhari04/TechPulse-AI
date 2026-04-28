const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Exclude source maps and dev-only packages from production bundles
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    // Aggressive minification for production
    compress: {
      drop_console: true,      // Strips all console.log — saves space + hides logs
      drop_debugger: true,
      pure_funcs: ['console.info', 'console.debug', 'console.warn'],
    },
    mangle: {
      toplevel: true,
    },
  },
};

// Exclude large unused packages from the bundle
config.resolver = {
  ...config.resolver,
  blockList: [
    // Block server-side only packages that may accidentally get bundled
    /.*\/__tests__\/.*/,
  ],
};

module.exports = withNativeWind(config, { input: "./global.css" });
