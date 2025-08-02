// config-overrides.js

module.exports = function override(config, env) {
    // Exclude node_modules from source-map-loader
    const sourceMapLoader = config.module.rules.find(
      (rule) =>
        rule.enforce === 'pre' &&
        rule.use &&
        rule.use.some(
          (u) => u.loader && u.loader.includes('source-map-loader')
        )
    );
  
    if (sourceMapLoader) {
      sourceMapLoader.exclude = [/node_modules/];
    }
  
    return config;
  };
  