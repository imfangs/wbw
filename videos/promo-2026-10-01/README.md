# WBW 宣传短片工程

本地交付：`final.mp4`（31 秒、1920×1080、25fps）与 `poster.jpg`。当前验收、输出 SHA 与剩余问题以 `production-state.json` 为准；审阅见 `review.md`。

## 重现

从本工程所在机器执行，保留浏览器与 FFmpeg 工具身份：

```bash
node /Users/fangs/workspace/side/wbw/videos/promo-2026-10-01/scripts/audit.mjs
python3 /Users/fangs/workspace/side/wbw/videos/promo-2026-10-01/scripts/make_assets.py
node /Users/fangs/workspace/side/wbw/videos/promo-2026-10-01/scripts/capture.mjs sample
python3 /Users/fangs/workspace/side/wbw/videos/promo-2026-10-01/scripts/render.py sample
node /Users/fangs/workspace/side/wbw/videos/promo-2026-10-01/scripts/capture.mjs full
python3 /Users/fangs/workspace/side/wbw/videos/promo-2026-10-01/scripts/render.py full
python3 /Users/fangs/workspace/side/wbw/videos/promo-2026-10-01/scripts/verify.py
node /Users/fangs/workspace/side/wbw/videos/promo-2026-10-01/scripts/playback.mjs
python3 /Users/fangs/workspace/side/wbw/videos/promo-2026-10-01/scripts/manifest.py
```

实际线上内容、字体网络、捕获帧会随时间变化；重新捕获不承诺相同媒体字节。已有 `raw/`、字幕 PNG 与配乐 WAV 可直接重剪。渲染源与工具 SHA 保存于 `evidence/full-render-identity.json`、`evidence/toolchain.json`；任一输入改变后须重新验最终 MP4。

`playback.mjs` 自行启动独占 `127.0.0.1:18773` 服务、在全新 Chromium 中点击播放并等待 `ended`、最后关闭浏览器与服务。该脚本不部署任何内容。需要可见本地预览时可临时执行：

```bash
python3 -m http.server 18773 --bind 127.0.0.1 --directory /Users/fangs/workspace/side/wbw/videos/promo-2026-10-01
```

用完 Ctrl+C；不要长期常驻。该服务器不视为 Hi 集成验收。

## 源与边界

- 真实画面：https://wbw.fangs.cc/ ，独立无登录浏览器。文章：《拖延者为何拖延》，原文 Tim Urban / Wait But Why。
- 界面截图包含少量原文插图用于说明阅读过程，不分发完整文章内容，不声称官方译站。
- 源录屏无音轨，输出配乐由 `make_assets.py` 原创合成，不是产品原声。没有旁白，也不将长文改编成朗读。
- 本机字体只用于画面渲染，不分发字体文件；作者/来源/哈希见 `assets.json`。
- 本工程未修改产品、没有部署或 push。Hi 建议仅作为待集成的本地作品，发布后的页面验收须另做。
