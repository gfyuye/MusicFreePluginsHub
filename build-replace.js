// build-replace.js
const fs = require('fs');
const path = require('path');

// 优先使用自定义域名，否则用 Cloudflare Pages 默认域名
const baseUrl = process.env.CUSTOM_DOMAIN
  ? `https://${process.env.CUSTOM_DOMAIN}`
  : (process.env.CF_PAGES_URL || 'https://你的项目名.pages.dev');

const accessKey = process.env.TOKEN_ACCESS_KEY || '你的默认暗号';

// 构造新的 token URL
const newTokenUrl = `${baseUrl}/lib/token.json?key=${accessKey}`;

// 目标目录：dist/tvbox/ 下的所有 JSON 文件
const tvboxDir = path.join(__dirname, 'dist', 'tvbox');

console.log(`[Build] 正在替换令牌地址为: ${newTokenUrl}`);

// 递归遍历目录，找出所有 .json 文件
function findJsonFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`[Build] 警告：目录不存在: ${dir}`);
    return [];
  }

  const results = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      results.push(...findJsonFiles(fullPath));
    } else if (item.endsWith('.json')) {
      results.push(fullPath);
    }
  }

  return results;
}

// 执行替换
const jsonFiles = findJsonFiles(tvboxDir);

if (jsonFiles.length === 0) {
  console.log('[Build] 警告：没有找到任何 JSON 文件。');
  process.exit(0);
}

let replacedCount = 0;

for (const file of jsonFiles) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;

    // 把所有 ./lib/token.json 替换为新的完整 URL
    content = content.replace(/\.\/lib\/token\.json/g, newTokenUrl);

    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`[Build] ✅ 已替换: ${path.relative(__dirname, file)}`);
      replacedCount++;
    } else {
      console.log(`[Build] ⏭️ 跳过（无匹配）: ${path.relative(__dirname, file)}`);
    }
  } catch (err) {
    console.error(`[Build] ❌ 替换失败: ${path.relative(__dirname, file)}`, err.message);
  }
}

console.log(`[Build] 完成，共替换 ${replacedCount}/${jsonFiles.length} 个文件。`);
