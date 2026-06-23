const fs = require('fs');

const path = './src/screens/AuthScreen.jsx';
let content = fs.readFileSync(path, 'utf8');

// Remove all <Vignette /> calls
content = content.replace(/<Vignette \/>/g, '');

// Also remove the definition of Vignette function
content = content.replace(/\/\/ ── CRT vignette overlay[^\n]*\nfunction Vignette\(\) {[\s\S]*?return \([\s\S]*?<View pointerEvents="none" style=\{st\.vignette\} \/>[\s\S]*?\);[\s\S]*?}/, '');

fs.writeFileSync(path, content);
console.log('Removed Vignette from AuthScreen');
