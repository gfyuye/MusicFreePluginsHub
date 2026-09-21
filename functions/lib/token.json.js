// functions/lib/token.json.js

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // ===== 暗号验证 =====
  const secretKey = context.env.TOKEN_ACCESS_KEY;
  if (!secretKey) {
    return new Response('Access key not configured', { status: 500 });
  }

  if (url.searchParams.get('key') !== secretKey) {
    // 返回 404 而不是 403，避免暴露接口存在
    return new Response('Not Found', { status: 404 });
  }

  // ===== 读取各网盘凭证 =====
  const tokenPool = {
    ali: {
      token: context.env.ALI_TOKEN || '',
      open_token: context.env.ALI_OPEN_TOKEN || '',
    },
    quark: {
      cookie: context.env.QUARK_COOKIE || '',
    },
    uc: {
      cookie: context.env.UC_COOKIE || '',
    },
    "115": {
      cookie: context.env.COOKIE_115 || '',
    },
    pikpak: {
      username: context.env.PIKPAK_USERNAME || '',
      password: context.env.PIKPAK_PASSWORD || '',
    },
  };

  // ===== 返回 JSON =====
  return new Response(JSON.stringify(tokenPool, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
