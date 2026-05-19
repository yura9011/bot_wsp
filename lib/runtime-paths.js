const path = require("path");

const APP_ROOT = path.resolve(__dirname, "..");

function resolveRuntimePath(inputPath, baseDir = APP_ROOT) {
  if (!inputPath) return null;
  return path.isAbsolute(inputPath)
    ? path.normalize(inputPath)
    : path.resolve(baseDir, inputPath);
}

module.exports = {
  APP_ROOT,
  resolveRuntimePath
};
