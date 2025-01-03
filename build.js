const fs = require('fs');
const path = require('path');

function copyFiles() {
  // 确保目标目录存在
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  // 复制 manifest.json
  fs.copyFileSync('manifest.json', 'dist/manifest.json');

  // 复制资源文件
  if (fs.existsSync('assets')) {
    copyDir('assets', 'dist/assets');
  }

  // 复制HTML和CSS文件
  copyDir('src/popup', 'dist/popup', ['.html', '.css']);
}

function copyDir(src, dest, extensions = null) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);

    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath, extensions);
    } else {
      if (!extensions || extensions.some(ext => file.endsWith(ext))) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  });
}

copyFiles();