console.log('🚀 Script de build iniciado...');

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');

function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach(element => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isFile()) {
      fs.copyFileSync(fromPath, toPath);
    } else {
      copyFolderSync(fromPath, toPath);
    }
  });
}

try {
  // Criar diretório dist
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
    console.log('✅ Diretório dist criado');
  }

  // Copiar arquivos HTML
  const htmlFiles = ['index.html', 'about.html', 'contact.html', 'admin.html'];
  htmlFiles.forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, `dist/${file}`);
      console.log(`✅ Copiado: ${file}`);
    }
  });

  // Copiar assets
  const assetDirs = ['css', 'js', 'images', 'fonts'];
  assetDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      copyFolderSync(dir, path.join('dist', dir));
      console.log(`✅ Pasta copiada: ${dir}`);
    }
  });

  // Minificar arquivos JS
  const jsDir = path.join('dist', 'js');
  if (fs.existsSync(jsDir)) {
    fs.readdirSync(jsDir).forEach(file => {
      if (file.endsWith('.js')) {
        const filePath = path.join(jsDir, file);
        const code = fs.readFileSync(filePath, 'utf8');
        minify(code).then(result => {
          fs.writeFileSync(filePath, result.code, 'utf8');
          console.log(`✨ JS minificado: ${file}`);
        });
      }
    });
  }

  // Minificar arquivos CSS
  const cssDir = path.join('dist', 'css');
  if (fs.existsSync(cssDir)) {
    fs.readdirSync(cssDir).forEach(file => {
      if (file.endsWith('.css')) {
        const filePath = path.join(cssDir, file);
        const code = fs.readFileSync(filePath, 'utf8');
        const output = new CleanCSS().minify(code);
        fs.writeFileSync(filePath, output.styles, 'utf8');
        console.log(`✨ CSS minificado: ${file}`);
      }
    });
  }

  console.log('🎉 Build concluído!');
} catch (error) {
  console.error('❌ Erro:', error.message);
}
