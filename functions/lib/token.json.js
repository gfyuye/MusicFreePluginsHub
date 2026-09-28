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

  // ===== 读取各平台凭证 =====
  const tokenPool = {
    // 阿里云盘（32位 token + 280位 open_token）
    ali: {
      token: context.env.ALI_TOKEN || '',
      open_token: context.env.ALI_OPEN_TOKEN || '',
    },

    // 夸克网盘（Cookie 字符串）
    quark: {
      cookie: context.env.QUARK_COOKIE || '',
    },

    // UC 网盘（Cookie 字符串）
    uc: {
      cookie: context.env.UC_COOKIE || '',
    },

    // 115 网盘（Cookie 字符串，关键字段：UID、CID、SEID、KID）
    "115": {
      cookie: context.env.COOKIE_115 || '',
    },

    // 迅雷网盘（用户名 + 密码）
    thunder: {
      username: context.env.THUNDER_USERNAME || '',
      password: context.env.THUNDER_PASSWORD || '',
    },

    // PikPak（用户名 + 密码）
    pikpak: {
      username: context.env.PIKPAK_USERNAME || '',
      password: context.env.PIKPAK_PASSWORD || '',
    },

    // 天翼云盘（用户名 + 密码）
    cloud189: {
      username: context.env.CLOUD189_USERNAME || '',
      password: context.env.CLOUD189_PASSWORD || '',
    },

    // 123 网盘（用户名 + 密码）
    "123pan": {
      username: context.env.PAN123_USERNAME || '',
      password: context.env.PAN123_PASSWORD || '',
    },

    // Bilibili（Cookie 字符串，关键字段：SESSDATA、bili_jct、buvid3）
    bili: {
      cookie: context.env.BILI_COOKIE || '',
    },

    // YouTube（OAuth 2.0 令牌）
    youtube: {
      access_token: context.env.YOUTUBE_ACCESS_TOKEN || '',
      refresh_token: context.env.YOUTUBE_REFRESH_TOKEN || '',
      token_type: 'Bearer',
      expiry: context.env.YOUTUBE_TOKEN_EXPIRY || '',
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
