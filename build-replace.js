// build-replace.js
const fs = require('fs');
const path = require('path');

// 从 Cloudflare Pages 自动注入的环境变量中获取部署域名[citation:16]
// 如果你绑定了自定义域名，这里需要改成硬编码你的域名，或者用你自己的环境变量
const baseUrl = process.env.CF_PAGES_URL || 'https://你的自定义域名';
const accessKey = process.env.TOKEN_ACCESS_KEY || '你的默认暗号';

// 构造新的 token URL
const newTokenUrl = `${baseUrl}/lib/token.json?key=${accessKey}`;

// 目标配置文件路径（按你的实际情况修改）
const configPath = path.join(__dirname, 'dist', 'tvbox', 'config.json');

console.log(`[Build] 正在替换令牌地址为: ${newTokenUrl}`);

try {
    let content = fs.readFileSync(configPath, 'utf8');

    // 执行替换：把所有 ./lib/token.json 替换为新的完整 URL
    // 注意：这里用简单的字符串替换，确保你的配置中路径是统一的
    const originalContent = content;
    content = content.replace(/\.\/lib\/token\.json/g, newTokenUrl);

    if (content === originalContent) {
        console.log('[Build] 警告：没有找到 ./lib/token.json，请检查路径是否正确。');
    } else {
        fs.writeFileSync(configPath, content, 'utf8');
        console.log('[Build] 令牌地址替换完成。');
    }
} catch (err) {
    console.error('[Build] 替换失败:', err.message);
    process.exit(1); // 让构建失败，避免部署错误配置
}
