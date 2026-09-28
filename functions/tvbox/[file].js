// functions/tvbox/[file].js
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const key = url.searchParams.get('key');

  // 从静态资源获取原始配置（去掉 key 参数）
  const assetUrl = new URL(context.request.url);
  assetUrl.search = '';
  const response = await context.env.ASSETS.fetch(assetUrl);

  // 不带 key 或 key 错误 → 返回原始配置（含 ./lib/token.json）
  if (!key || key !== context.env.TOKEN_ACCESS_KEY) {
    return response;
  }

  // 带正确的 key → 替换 token 地址
  let content = await response.text();
  const newTokenUrl = `${url.origin}/lib/token.json?key=${key}`;
  content = content.replace(/\.\/lib\/token\.json/g, newTokenUrl);

  return new Response(content, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
