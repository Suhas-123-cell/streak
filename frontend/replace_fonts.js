const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // We replace fontWeight: '600' with fontFamily: 'Oswald-SemiBold'
      // Note: we might need to remove fontWeight entirely, but keeping it is fine as fontFamily overrides it on iOS. 
      // To be clean:
      content = content.replace(/fontWeight:\s*['"]600['"]/g, "fontFamily: 'Oswald-SemiBold'");
      content = content.replace(/fontWeight:\s*['"]700['"]/g, "fontFamily: 'Oswald-Bold'");
      content = content.replace(/fontWeight:\s*['"]800['"]/g, "fontFamily: 'Oswald-Bold'");
      content = content.replace(/fontWeight:\s*['"]900['"]/g, "fontFamily: 'Oswald-Bold'");
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

replaceInDir('./src');
console.log('Done replacing fonts!');
