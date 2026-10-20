<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# AGENTS.md · 个人作品集网站项目约定

本文件面向在本仓库中工作的开发者与编程智能体。**先读第 1 节，再动代码。**

| 项目 | 内容 |
| --- | --- |
| 项目 | 王略帆个人作品集网站 |
| 技术栈 | Next.js 16.4.2（App Router）· React 19 · TypeScript 5 · 原生 CSS Modules |
| 关联文档 | `PRD.md`（需求）、`TECH_DESIGN.md`（技术方案） |
| 内容数据源 | `content/site.json`（**唯一**，不存在第二份内容副本） |

---

## 1. 开工前必读

当前 Next.js 版本与训练数据存在差异，以下四条是**本工程已实测踩坑**的硬约束：

1. **不要写 `export const dynamic` / `export const runtime`**。本工程 `next.config.ts` 启用了 `cacheComponents`，
   Next.js 16.4 会直接以构建错误拒绝这类路由段配置。Route Handler 访问 Cookie 等运行时数据时会自动按请求执行。
2. **`cookies()` / `headers()` / `params` / `searchParams` 均为异步**，必须 `await`。同步访问已在 16 版本移除。
3. **`middleware` 已更名为 `proxy`**（`proxy.ts` + 导出 `proxy` 函数），且 `proxy` 不支持 `edge` 运行时。
4. **Turbopack 已是 `next dev` 与 `next build` 的默认**，不要添加 `--turbopack` 参数；若引入带 `webpack` 配置的插件，构建会失败。

个性化类型工具 `LayoutProps<"/">` 等由 `next typegen` 生成（`next dev` / `next build` 时自动执行），可直接使用。

---

## 2. 内容变更规则（最高优先级）

> **任何改动页面展示信息的操作，都必须改 `content/site.json`，不得把内容写死在组件里，也不得新增第二份内容副本。**

- 前台 `app/page.tsx` 只负责渲染 `lib/content.ts` 导出的 `content`，**不内置任何用户信息字面量**。
- 新增字段时，需同步修改三处，缺一不可：
  1. `content/site.json`（初始值）
  2. `lib/content.ts` 中的类型定义（`Profile` / `Skill` / `Project` / `SiteContent`）
  3. `lib/content.ts` 中 `validateSiteContent()` 的校验分支，以及 `app/admin/page.tsx` 的表单字段
- 字段上限统一收敛在 `lib/content.ts` 的 `MAX` 常量中，不要在别处另开一套限制。

### 2.1 隐私红线

**公网页面不得出现完整学号。** `content/site.json` 中的 `profile.studentIdMasked` 存的是**打码后的展示值**
（当前为 `222023****`）。任何新增展示区、新增接口、日志输出都不得回显完整学号。

若要新增敏感字段，先在 PRD 中评估是否应当展示。

### 2.2 占位内容约定

`skills[].draft` 与 `projects[].draft` 为 `true` 表示该条为占位示例。前台会在对应区块顶部渲染统一的提示，
后台以复选框维护。**替换为真实内容后必须取消勾选**，否则前台会一直提示「示例内容」。

---

## 3. 目录职责

| 路径 | 职责 | 不要放什么 |
| --- | --- | --- |
| `app/page.tsx` / `page.module.css` | 前台版面 | 用户信息字面量、数据获取逻辑 |
| `app/admin/page.tsx` | 后台交互界面（客户端组件） | 直接的文件读写、令牌 |
| `app/api/**/route.ts` | 接口边界 | 界面状态、样式 |
| `lib/content.ts` | 内容类型 + 边界校验 | 网络请求、DOM 逻辑 |
| `lib/auth.ts` | 口令比对 + 会话签名 | 业务内容逻辑 |
| `lib/repo.ts` | 内容写回（GitHub / 本地文件） | 界面逻辑 |
| `app/globals.css` | 设计令牌 + 基础样式 + 跨页共享原语 | 单页专属版面 |

`app/page.module.css` 与 `app/admin/admin.module.css` 只承载对应页面的版面规则。

---

## 4. 编码约定

### 4.1 安全

- **任何密钥、口令、令牌都不得进入仓库**。全部经环境变量读取，模板见 `.env.example`，本地值写入 `.env.local`（已被 `.gitignore` 忽略）。
- 口令与签名比对必须使用 `timingSafeEqual`，不得使用 `===`。
- `lib/auth.ts` 中的两个拒绝策略不得放宽：
  - 未配置 `ADMIN_PASSWORD` 时**一律拒绝登录**（不设默认口令）；
  - 生产环境未配置足够长度的 `SESSION_SECRET` 时**直接抛错**（不降级为固定密钥）。
- 会话 Cookie 必须保持 `httpOnly` + `sameSite=lax`，生产环境必须加 `secure`。
- 接口层是真正的防线。**任何新增的读写接口都必须先调用 `isAuthenticated()`**；不要只依赖界面隐藏入口。

### 4.2 边界校验

- `app/api/content/route.ts` 的 `PUT` 是系统边界，**必须先过 `validateSiteContent()`**，校验失败返回 400，不得静默兜底。
- 校验函数会重建干净对象并丢弃未声明字段：新增字段时若不补校验分支，该字段会被静默丢弃——这是刻意的，避免脏数据污染前台渲染。

### 4.3 类型

- 客户端组件引用内容类型时，**必须用 `import type`**，否则会把 `content/site.json` 一并打进客户端包。
  例：`import type { SiteContent } from "@/lib/content";`

### 4.4 界面

- 设计方向为 **Quiet Craft（克制工艺）**：层级由字号、字重、间距承担，颜色只做辅助。
  强调色为单一深海蓝 `--accent`，**只用于链接、当前分区编号与焦点态**；不要为了「好看」扩大它的使用面积。
- 新增颜色请以 OKLCH 写入 `app/globals.css` 的 `:root` 令牌，不要在 `:root` 之外硬编码色值。
- 避免通用套路化界面：不做同一模具的卡片网格、不做无意义的玻璃拟态与渐变文字。
- 现有原语（`.container` / `.mono` / `.tag` / `.btn` / `.field` / `.label` / `.notice`）在 `app/globals.css` 中定义，
  页面模块通过组合使用它们（`className={`btn btn-primary`}`），不要复制一份样式。
- 必须保留：`:focus-visible` 焦点样式、`prefers-reduced-motion` 降级、语义化标签与 `aria` 标注、窄屏可用性。

### 4.5 文案

- 界面语言为**中文**；代码注释同样使用中文。
- 面向访客的文案要具体，避免「让我们一起打造令人惊叹的作品」这类空话。
  CTA 必须说明真实的下一步（当前主 CTA 为「发送邮件」）。

---

## 5. 命令

```bash
npm run dev     # 开发服务器，含类型生成；后台在 /admin
npm run build   # 生产构建，含 TypeScript 类型检查（Turbopack）
npm start       # 以生产产物启动
npm run lint    # ESLint（Next.js 16 已移除 next lint，改用 ESLint CLI）
```

**提交前必须 `npm run build` 通过。** 类型检查挂在构建流程内，构建失败即视为不合格。

---

## 6. 提交约定

- 提交信息使用祈使句并以类型前缀开头（`feat` / `fix` / `docs` / `chore` / `refactor`）。
- 后台保存内容会产生自动提交，信息格式为 `chore(content): 后台更新站点内容 <ISO 时间>`。
  **不要手工编辑这类提交，也不要 force push 覆盖它们**——内容的可追溯性依赖这条记录。
- 修改 `app/**` 或 `lib/**` 后，若行为契约有变化，同步更新 `TECH_DESIGN.md` 对应章节。

---

## 7. 智能体工作流

1. 读取 `content/site.json` 与 `lib/content.ts`，确认当前内容模型；
2. 若涉及框架 API，先查 `node_modules/next/dist/docs/` 中与版本匹配的文档（见第 1 节）；
3. 改动内容模型时，按第 2 节的「三处同步」清单逐项落实；
4. 运行 `npm run build`；
5. 若改动涉及后台或接口，至少验证：未登录 401、错误口令 401、登录后可读写、登出后会话失效；
6. 视觉改动需在 1440px 与 560px 两档宽度下确认版面；
7. 汇报时说明改了什么、验证了什么、还剩哪些未验证。

### 7.1 明确禁止

- 禁止把内容写死在组件里（违反第 2 节）；
- 禁止为了「更快」而在生产环境放宽鉴权或校验；
- 禁止引入 `localStorage` 作为内容存储 —— 作业要求「部署后仍可修改信息」，
  浏览器本地存储不满足该要求（见 `TECH_DESIGN.md` 第 1.2 节）；
- 禁止回显完整学号（违反第 2.1 节）；
- 禁止在未配置 `GITHUB_TOKEN` 的生产环境中把写回降级为本地文件写入。
