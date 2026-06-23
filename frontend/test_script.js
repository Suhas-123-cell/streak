const { execSync } = require('child_process');
// Tap "PRESS START" (coordinates roughly 200, 500)
execSync('xcrun simctl io booted tap 200 600');
