const requireDir = require("require-dir");

module.exports = requireDir(".", {
  mapKey(value, baseName) {
    return value.fileHostName;
  },

  mapValue(value, baseName) {
    return new value();
  }
});
