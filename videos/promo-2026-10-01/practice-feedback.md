# 本轮实践反馈

日期：2026-10-01。消费项目：WBW。只写本工程；FBT / Skill 回流由批次协调者集中处理。

## 已验证的项目修复：插画选择器后缀冲突

- 触发：完整版阅读镜头准备时，`img[src$="P-brain.png"]` 同时匹配 `NP-brain.png` 与 `P-brain.png`，Playwright strict mode 阻止继续。失败前三个独立片段已保存。
- 根因：项目图片文件名存在后缀重合，定位条件缺少路径分隔符；与网站或 FBT 故障无关。
- 修复：收窄成 `img[src$="/P-brain.png"]`，保留已完成片段并断点接续；浏览器生命周期增加 finally 关闭。没有修改产品。
- 回读：`raw/full/capture.json` 的 reading 中 15 张图均 complete、naturalWidth > 0，pageerror 为 0，所选 P-brain 位置开始后真实鼠标滚轮 420px。`evidence/capture-retry.md` 保存错误与处理，失败中间文件未伪装为成功素材。
- 适用边界：这是本项目选择器修正；不扩为新通用捕获框架。按已有 capture reference 的“失败回读—定位—重拍”执行已足够。

## 能力发现阻断：本轮只旁路，不改他人能力

- 首次 `fbt info browser --json` 与 `fbt info promo-video --json` 都返回 `registry_invalid`：`workflows/reference-to-collectible/capability.json` 的 `sources`、`studio` entrypoint 含不接受的 `help_command` 字段。
- 依委派说明直接读取已知权威 `fbt/workflows/promo-video/SKILL.md` 及 capture/render-review，完成实际工作。不以该无关 registry 状态为制作阻塞，也不改另一任务的文件。
- 待协调者判断：全库校验错误是否应阻止读取一个已知有效能力。只有本轮观测，不声称已经修好。

## 本次取舍，不升级为通用规则

阅读片保留 1× 的真实滚动；标题放画外、声音使用原创稀疏合成音符、无旁白。原站录屏无声音，合成音轨在素材表里单列。短片只展示少量文章段落和两张相邻图解，不把正文变成可替代原文的朗读片。具体构图和时长是本作品首稿，不证明更高转化或阅读体验。

媒体与播放验收的最终文件身份见 `review.md`、`production-state.json`。实际听感、首次观众是否愿意点开阅读与用户审美反馈待验证。
