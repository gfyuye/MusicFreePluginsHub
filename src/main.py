import asyncio
import ujson as json
from pathlib import Path
from loguru import logger
from httpx import AsyncClient
import re

# CDN
CDN_URL = "https://raw.githubusercontent.com/gfyuye/MusicFreePluginsHub/refs/heads/main/js/"
USE_CDN = True
VERSION = "0.2.0"

# 定义路径常量
BASE_DIR = Path(__file__).parent.parent  # 项目根目录
DATA_DIR = BASE_DIR / "data"  # 数据目录
DATA_DIR.mkdir(exist_ok=True)
DATA_JSON_PATH = DATA_DIR / "origins.json"

JS_DIR = BASE_DIR / "js"  # JS文件目录
JS_DIR.mkdir(exist_ok=True)

DIST_DIR = BASE_DIR / "dist"  # 输出目录
DIST_DIR.mkdir(exist_ok=True)
DIST_JSON_PATH = DIST_DIR / "all.json"  # 主插件列表
PLUGINS_JSON_PATH = DIST_DIR / "plugins.json"  # 原始链接列表

# 重试相关常量
MAX_RETRIES = 3
RETRY_DELAY = 1
REQUEST_TIMEOUT = 10.0

# 文件名清理函数
def sanitize_filename(name: str) -> str:
    """清理文件名，移除非法字符"""
    # 移除特殊字符，只保留字母、数字、汉字、下划线和空格
    cleaned = re.sub(r'[^\w\u4e00-\u9fff\s]', '', name)
    # 替换空格为下划线
    cleaned = cleaned.replace(' ', '_')
    # 限制文件名长度
    return cleaned[:50] if cleaned else "plugin"

async def fetch_sub_plugins(url: str, client: AsyncClient) -> list:
    """从订阅源获取单个插件列表

    Args:
        url: 订阅源URL
        client: HTTP客户端实例

    Returns:
        插件列表,获取失败返回空列表
    """
    for retry in range(MAX_RETRIES):
        try:
            response = await client.get(url, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            data = response.json()
            return data.get("plugins", [])
        except Exception as e:
            if retry == MAX_RETRIES - 1:
                logger.error(
                    f"订阅源 {url} 获取失败(重试{retry + 1}/{MAX_RETRIES}): {str(e)}"
                )
                return []
            logger.warning(
                f"订阅源 {url} 获取失败(重试{retry + 1}/{MAX_RETRIES}): {str(e)}"
            )
            await asyncio.sleep(RETRY_DELAY)


async def fetch_plugins(plugins: list, client: AsyncClient) -> tuple[list, list]:
    """获取有效的插件列表和原始链接

    Args:
        plugins: 待处理的插件列表
        client: HTTP客户端实例

    Returns:
        (有效的插件列表, 原始链接列表)
    """
    seen_urls = set()  # 用于去重
    name_count = {}  # 用于统计重名插件
    original_urls = []  # 存储所有原始链接

    async def download_and_process_plugin(plugin: dict) -> tuple[bool, dict]:
        """下载插件并处理URL

        Args:
            plugin: 单个插件信息

        Returns:
            (成功标志, 处理后的插件信息)
        """
        url = plugin["url"]
        if url in seen_urls:
            return False, plugin
        seen_urls.add(url)
        
        # 保存原始链接
        original_urls.append(url)

        for retry in range(MAX_RETRIES):
            try:
                response = await client.get(url, timeout=REQUEST_TIMEOUT)
                response.raise_for_status()

                # 处理插件名称
                name = plugin.get("name", url)
                # 替换敏感词
                name = name.replace("网易云", "W").replace("QQ", "T")
                
                # 处理重名
                if name in name_count:
                    name_count[name] += 1
                    plugin_name = f"{name}_{name_count[name]}"
                else:
                    name_count[name] = 0
                    plugin_name = name
                
                # 清理文件名
                clean_name = sanitize_filename(plugin_name)
                filename = f"{clean_name}.js"
                
                # 保存插件文件到 js 目录
                output_path = JS_DIR / filename
                output_path.write_text(response.text, encoding='utf-8')
                
                # 更新插件信息
                new_plugin = plugin.copy()
                new_plugin["name"] = plugin_name
                
                # 使用 CDN 或直接使用相对路径
                if USE_CDN:
                    new_plugin["url"] = f"{CDN_URL}{filename}"
                else:
                    # 使用相对路径指向 js 目录
                    new_plugin["url"] = f"js/{filename}"

                logger.success(f"插件 {plugin_name} 下载成功: {output_path}")
                return True, new_plugin

            except Exception as e:
                if retry == MAX_RETRIES - 1:
                    logger.error(
                        f"插件 {plugin.get('name', url)} 下载失败(重试{retry + 1}/{MAX_RETRIES}): {str(e)}"
                    )
                    return False, plugin
                logger.warning(
                    f"插件 {plugin.get('name', url)} 下载失败(重试{retry + 1}/{MAX_RETRIES}): {str(e)}"
                )
                await asyncio.sleep(RETRY_DELAY)

    # 并发下载和处理插件
    tasks = [download_and_process_plugin(plugin) for plugin in plugins]
    results = await asyncio.gather(*tasks)

    valid_plugins = [new_plugin for success, new_plugin in results if success]
    return valid_plugins, original_urls


async def load_origins() -> dict:
    """加载源配置文件

    Returns:
        源配置字典,加载失败返回空配置
    """
    try:
        with open(DATA_JSON_PATH, encoding="utf8") as f:
            return json.loads(f.read())
    except Exception as e:
        logger.error(f"读取源列表文件失败: {str(e)}")
        return {"sources": [], "singles": []}


def save_plugin_list(file_path: Path, data: dict) -> bool:
    """保存插件列表到文件

    Args:
        file_path: 文件路径
        data: 要保存的数据

    Returns:
        保存是否成功
    """
    try:
        with open(file_path, "w", encoding="utf-8") as file:
            json_str = json.dumps(data, ensure_ascii=False, indent=2)
            json_str = json_str.replace("\\/", "/")
            file.write(json_str)
        logger.success(f"文件已保存至: {file_path}")
        return True
    except Exception as e:
        logger.error(f"保存文件 {file_path} 失败: {str(e)}")
        return False


async def collect_plugins(origins: dict, client: AsyncClient) -> list:
    """收集所有插件

    Args:
        origins: 源配置信息
        client: HTTP客户端实例

    Returns:
        收集到的所有插件列表
    """
    all_plugins = []

    # 获取订阅源插件
    if sources := origins.get("sources", []):
        logger.info(f"正在获取 {len(sources)} 个订阅源的插件...")
        for source_url in sources:
            plugins = await fetch_sub_plugins(source_url, client)
            if plugins:
                logger.info(f"从 {source_url} 获取到 {len(plugins)} 个插件")
                all_plugins.extend(plugins)

    # 添加单独插件
    if singles := origins.get("singles", []):
        logger.info(f"添加 {len(singles)} 个单独插件...")
        all_plugins.extend(singles)

    return all_plugins


async def main():
    """主函数"""
    logger.info("开始执行插件更新任务...")

    # 清空 js 目录中的 JS 文件
    for js_file in JS_DIR.glob("*.js"):
        js_file.unlink()
    logger.info(f"已清空 {JS_DIR} 目录中的 JS 文件")

    # 1. 加载配置
    origins = await load_origins()
    if not origins:
        return

    # 2. 处理插件
    async with AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
        # 收集所有插件
        all_plugins = await collect_plugins(origins, client)
        if not all_plugins:
            logger.warning("未获取到任何插件")
            return

        # 下载和验证插件
        logger.info(f"开始下载和验证 {len(all_plugins)} 个插件...")
        valid_plugins, original_urls = await fetch_plugins(all_plugins, client)

        if not valid_plugins:
            logger.error("没有有效的插件")
            return

        logger.info(f"成功验证 {len(valid_plugins)} 个插件")
        logger.info(f"收集到 {len(original_urls)} 个原始链接")

    # 3. 保存结果
    # 保存 all.json 到 dist 目录 - 包含处理后的插件信息
    all_success = save_plugin_list(DIST_JSON_PATH, {"desc": VERSION, "plugins": valid_plugins})
    
    # 保存 plugins.json 到 dist 目录 - 包含所有原始链接
    plugins_success = save_plugin_list(
        PLUGINS_JSON_PATH, 
        {"desc": VERSION, "original_urls": original_urls}
    )

    if all_success and plugins_success:
        logger.success(f"任务完成! 共更新 {len(valid_plugins)} 个插件")


if __name__ == "__main__":
    asyncio.run(main())
