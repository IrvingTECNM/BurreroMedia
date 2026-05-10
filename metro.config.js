// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Zustand's ESM build (esm/*.mjs) uses `import.meta.env` which causes
// "Cannot use 'import.meta' outside a module" in Metro's web bundle.
// We redirect zustand imports to their CJS equivalents.
const zustandRoot = path.resolve(__dirname, 'node_modules', 'zustand');

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  // Map zustand subpath imports to CJS versions
  'zustand': path.join(zustandRoot, 'index.js'),
  'zustand/vanilla': path.join(zustandRoot, 'vanilla.js'),
  'zustand/middleware': path.join(zustandRoot, 'middleware.js'),
  'zustand/shallow': path.join(zustandRoot, 'shallow.js'),
  'zustand/context': path.join(zustandRoot, 'context.js'),
};

// Also tell Metro to prefer .js over .mjs for resolving
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Intercept zustand ESM imports
  if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
    const subpath = moduleName === 'zustand' ? 'index' : moduleName.replace('zustand/', '');
    const cjsPath = path.join(zustandRoot, `${subpath}.js`);
    return {
      filePath: cjsPath,
      type: 'sourceFile',
    };
  }
  
  // For everything else, use default resolution
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
