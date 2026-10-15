const { execSync } = require('child_process');
const path = require('path');

// Apple Silicon imzosiz ilovani "buzilgan" deb bloklaydi — ad-hoc imzo qo'yamiz (Developer hisobi shart emas).
exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') return;
  const app = path.join(context.appOutDir, context.packager.appInfo.productFilename + '.app');
  execSync(`codesign --force --deep --sign - "${app}"`, { stdio: 'inherit' });
};
