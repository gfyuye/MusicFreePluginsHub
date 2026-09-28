// functions/lib/token.json.js

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // ===== 暗号验证 =====
  const secretKey = context.env.TOKEN_ACCESS_KEY;
  if (!secretKey) {
    return new Response('Access key not configured', { status: 500 });
  }

  if (url.searchParams.get('key') !== secretKey) {
    return new Response('Not Found', { status: 404 });
  }

  // ===== 扁平结构：凭证直接铺在顶层 =====
  const tokenPool = {
    // 阿里云盘
    token: context.env.ALI_TOKEN || '',
    open_token: context.env.ALI_OPEN_TOKEN || '',

    // 夸克网盘
    quark_cookie: context.env.QUARK_COOKIE || '',

    // UC 网盘
    uc_cookie: context.env.UC_COOKIE || '',

    // 115 网盘
    pan115_cookie: context.env.COOKIE_115 || '',

    // 迅雷网盘
    thunder_username: context.env.THUNDER_USERNAME || '',
    thunder_password: context.env.THUNDER_PASSWORD || '',

    // PikPak
    pikpak_username: context.env.PIKPAK_USERNAME || '',
    pikpak_password: context.env.PIKPAK_PASSWORD || '',

    // Bilibili
    bili_cookie: context.env.BILI_COOKIE || '',

    // YouTube
    youtube_token: context.env.YOUTUBE_TOKEN || '',

    // 可选：网盘优先顺序
    pan_order: 'ali|quark|uc|115|thunder|pikpak',
  };

  // ===== 返回 JSON =====
  return new Response(JSON.stringify(tokenPool, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
