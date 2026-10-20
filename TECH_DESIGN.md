# TECH_DESIGN · 王略帆个人作品集网站

| 项目 | 内容 |
| --- | --- |
| 文档版本 | v1.0 |
| 最后更新 | 2026-10-20 |
| 关联文档 | `PRD.md`（需求）、`AGENTS.md`（协作者与智能体约定） |
| 实测环境 | Node.js v24.14.1 · npm 11.11.0 · Next.js 16.4.2 · React 19.3 · TypeScript 5 |

---

## 1. 设计目标与约束

### 1.1 必须满足的约束

| 编号 | 约束 | 来源 |
| --- | --- | --- |
| C1 | 部署在 Vercel 或 Cloudflare Pages | 作业要求 |
| C2 | 网站必须带后台，且能修改页面展示的个人信息 | 作业要求 |
| C3 | 公网页面不得出现完整学号 | 隐私要求（学号末四位打码） |
| C4 | 无数据库预算，无第三方付费服务 | 实现条件 |

### 1.2 由约束推导出的关键决策

C2 与 C4 存在张力：后台要能改内容，内容又必须在重新部署后仍然存在。若把内容存在浏览器本地（localStorage），
则「部署后仍可修改」不成立，且换设备即失效 —— 因此排除。

最终采用：**内容即代码**。内容以 JSON 文件形式存放在代码仓库中，后台通过 GitHub Contents API 把
修改提交回仓库，部署平台检测到提交后自动重新构建，前台读到新的 JSON。**用一次自动重新部署换取零数据库成本与完整的可追溯性。**

---

## 2. 技术选型

| 层 | 选型 | 理由 |
| --- | --- | --- |
| 框架 | Next.js 16（App Router） | Vercel 原生支持，静态渲染与 Route Handlers 在同一工程内，无需拆前后端 |
| 语言 | TypeScript | 内容模型与接口边界需要类型约束 |
| 样式 | 原生 CSS + CSS Modules | 本项目界面规模不需要原子化框架；避免引入构建期额外依赖 |
| 字体 | 系统字体栈 | 规避构建期向 Google Fonts 发起网络请求，构建更快且离线可构建 |
| 存储 | 仓库内的 `content/site.json` | 零成本、天然版本可追溯、与部署流水线天然打通 |
| 写回 | GitHub Contents API | 只需一个令牌即可完成提交，无需部署平台回调接口 |
| 鉴权 | 服务端口令 + HMAC 签名 Cookie | 单用户场景无需完整身份体系，避免过度设计 |
| 部署 | Vercel（推荐） | Next.js 原生适配，无需额外适配器 |

### 2.1 为什么不选 Cloudflare Pages

Next.js 16 在本工程中默认启用了 Cache Components，直接部署到 Cloudflare Pages 需要额外接入
`@opennextjs/cloudflare` 适配器，并自行处理运行时差异。Vercel 是零适配路径。**Cloudflare Pages 作为备选方案保留，
若采用则需引入该适配器并重新验证构建。**

### 2.2 未采用 Tailwind / 组件库

界面只有两名使用者（访客与所有者），页面结构固定为 4 个区块。以令牌化的原生 CSS 表达设计系统即可，
同时让最终产物更小、无额外依赖。设计令牌集中在 `app/globals.css` 的 `:root` 中。

---

## 3. 架构

```
                      ┌─────────────────────────────────────┐
   访客 ────────────▶ │  前台 /  （构建期静态渲染）          │
                      │  读取 content/site.json              │
                      └─────────────────────────────────────┘
                                     ▲
                                     │ 构建时打包
                      ┌──────────────┴──────────────────────┐
   所有者 ──────────▶ │  /admin  （客户端交互界面）          │
                      └──────────────┬──────────────────────┘
                                     │ fetch + HttpOnly Cookie
                      ┌──────────────▼──────────────────────┐
                      │  Route Handlers                      │
                      │  /api/auth/{login,logout,session}    │
                      │  /api/content  GET / PUT             │
                      └──────────────┬──────────────────────┘
                                     │ 口令校验 → 会话校验 → 结构校验
                      ┌──────────────▼──────────────────────┐
                      │  内容写回                             │
                      │  ① GitHub Contents API（线上）        │
                      │  ② 本地文件写入（仅开发环境回退）      │
                      └──────────────┬──────────────────────┘
                                     │ commit → 触发自动构建
                                     └────────▶ 回到「前台」静态渲染
```

### 3.1 目录结构

```
personal-site/
├── app/
│   ├── layout.tsx                     根布局（语言、元信息）
│   ├── globals.css                    设计令牌 + 基础样式 + 共享原语
│   ├── page.tsx                       前台页面（服务端组件）
│   ├── page.module.css                前台版面样式
│   ├── robots.ts                      禁止抓取 /admin 与 /api
│   ├── admin/
│   │   ├── layout.tsx                 后台布局（noindex 元信息）
│   │   ├── page.tsx                   后台界面（客户端组件）
│   │   └── admin.module.css           后台版面样式
│   └── api/
│       ├── auth/login/route.ts        登录，签发会话
│       ├── auth/logout/route.ts       登出，清除会话
│       ├── auth/session/route.ts      会话状态查询
│       └── content/route.ts           内容读取（GET）与保存（PUT）
├── content/site.json                  内容唯一数据源
├── lib/
│   ├── content.ts                     内容类型定义 + 落库前校验
│   ├── auth.ts                        口令比对 + 会话签名
│   └── repo.ts                        写回仓库 / 写回本地文件
├── PRD.md / TECH_DESIGN.md / AGENTS.md
├── next.config.ts                     cacheComponents、partialPrefetching 已启用
└── .env.example                       环境变量模板
```

---

## 4. 数据模型

`content/site.json` 为唯一数据源，结构如下（字段上限为落库校验规则）：

| 层级 | 字段 | 类型 | 约束 |
| --- | --- | --- | --- |
| `profile` | `name` | string | 必填，≤ 60 字 |
| | `nameEn` / `school` / `schoolEn` / `major` / `grade` / `location` | string | ≤ 60 字 |
| | `headline` | string | ≤ 200 字 |
| | `studentIdMasked` | string | ≤ 60 字；**存的是打码后的展示值** |
| | `email` / `github` | string | ≤ 200 字 |
| | `bio` | string | ≤ 600 字 |
| `skills[]` | `name` | string | 必填，≤ 60 字 |
| | `category` | string | ≤ 60 字，缺省为「其他」 |
| | `note` | string | ≤ 200 字 |
| | `draft` | boolean | 占位标记，前台据此提示 |
| `projects[]` | `title` | string | 必填，≤ 200 字 |
| | `period` / `role` | string | ≤ 60 字 |
| | `summary` | string | ≤ 600 字 |
| | `highlights[]` | string[] | ≤ 16 条，单条 ≤ 200 字 |
| | `tags[]` | string[] | ≤ 16 条，单条 ≤ 200 字 |
| | `link` / `repo` | string | ≤ 200 字，可空 |
| | `draft` | boolean | 占位标记 |
| `meta` | `updatedAt` | string | `YYYY-MM-DD`，保存时由服务端生成 |

数组整体上限：技能 40 条、项目 24 条。

**为什么在服务端做全量校验**：后台提交的数据属于系统边界输入。前台渲染完全依赖这份结构，
一旦写入畸形数据，页面即时报错。因此 `validateSiteContent()` 会重建一份干净对象，
丢弃未声明的字段，并对超长文本截断、对缺失必填项直接拒绝（返回 400），不做静默兜底。

---

## 5. 接口设计

| 方法 | 路径 | 鉴权 | 请求 | 响应 |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/login` | 否 | `{ password: string }` | 200 `{ ok: true }` + `Set-Cookie`；401 `{ ok: false, error }` |
| POST | `/api/auth/logout` | 是 | — | 200 `{ ok: true }` + 清除 Cookie |
| GET | `/api/auth/session` | 否 | — | 200 `{ ok: true, authenticated: boolean }` |
| GET | `/api/content` | 是 | — | 200 `{ ok: true, content }`；401 `{ ok: false, error }` |
| PUT | `/api/content` | 是 | `{ content }` 或裸对象 | 200 `{ ok: true, result, content }`；400 校验失败；401 未登录；502 写回失败 |

`result` 结构：`{ mode: "github" \| "local", message: string, commitUrl?: string }`

---

## 6. 鉴权设计

```
口令（ADMIN_PASSWORD，仅存服务端环境变量）
   │  登录时以 timingSafeEqual 做常量时间比对
   ▼
会话令牌 = "<到期时间戳>.<HMAC-SHA256(到期时间戳, SESSION_SECRET)>"   // base64url
   │  写入 HttpOnly Cookie：SameSite=Lax，path=/，有效期 8 小时，生产环境加 Secure
   ▼
后续请求：重新计算签名并用常量时间比对；再校验是否过期
```

设计要点：

- **口令不进前端**：前端只提交字符串，比对完全在服务端完成，产物中不含口令。
- **会话不可伪造**：签名密钥 `SESSION_SECRET` 独立于口令；生产环境若未配置或长度不足 16 位，直接抛错而非降级为默认值。
- **未配置口令则一律拒绝登录**：避免出现「忘记配置导致留了默认口令」的漏洞。
- **HttpOnly**：前端脚本无法读取会话 Cookie。
- **页面层保护**：`/admin` 未登录时仅渲染登录表单；真正的防线在接口层（未登录一律 401）。

---

## 7. 内容写回与部署闭环

这是本方案的核心机制。

```
后台「保存并部署」
   │
   ├─ 已配置 GITHUB_TOKEN + GITHUB_REPO
   │     1. GET /repos/{owner}/{repo}/contents/content/site.json?ref={branch}
   │        └─ 取当前文件的 sha（404 视为新建，不带 sha）
   │     2. PUT 同路径，body = { message, content: base64(JSON), branch, sha }
   │     3. 返回提交地址
   │
   └─ 未配置令牌且处于开发环境
         └─ 直接写入 content/site.json（便于本地离线验证；生产环境此路径被拒绝并报错）
```

提交完成后，部署平台检测到仓库变更 → 自动重新构建 → 前台读到的 `content/site.json` 即为新内容。
**因此「改内容」与「改代码」走的是同一条可靠通路：一次提交一次构建。**

代价：生效有约 1 分钟构建延迟；后台保存提示中已如实告知。

---

## 8. 环境变量

| 变量 | 必需性 | 用途 |
| --- | --- | --- |
| `ADMIN_PASSWORD` | 必需 | 后台登录口令 |
| `SESSION_SECRET` | 必需 | 会话签名密钥，长度 ≥ 16 |
| `GITHUB_TOKEN` | 线上必需 | 具有目标仓库 Contents 读写权限的令牌 |
| `GITHUB_REPO` | 线上必需 | `owner/repo` |
| `GITHUB_BRANCH` | 可选 | 默认 `main` |

- 本地：复制 `.env.example` 为 `.env.local` 并填写（该文件已被 `.gitignore` 忽略，不会进入仓库）。
- 线上：在部署平台的项目设置中以同名变量配置。

---

## 9. 本地运行

```bash
npm install
npm run dev     # http://localhost:3000，管理后台在 /admin
npm run build   # 生产构建（含 TypeScript 类型检查）
npm start       # 以生产产物启动
```

---

## 10. 部署路径

### 10.1 Vercel（推荐）

1. 将工程推送到 GitHub 仓库；
2. Vercel 新建项目并导入该仓库，框架自动识别为 Next.js，构建命令与输出目录保持默认；
3. 在项目环境变量中配置第 8 节的变量；
4. 部署完成后获得域名，形如 `https://<project>.vercel.app`；
5. 在 GitHub 生成细粒度令牌（Contents → Read and write）并填入 `GITHUB_TOKEN`，指向该仓库的 `GITHUB_REPO`；
6. 验证闭环：登录后台 → 修改内容 → 保存 → 确认仓库出现新提交 → 等待构建完成 → 前台已更新。

### 10.2 Cloudflare Pages（备选）

需额外引入 `@opennextjs/cloudflare` 适配器并配置构建命令，随后重复第 3–6 步。

---

## 11. 已知约束与取舍

| 约束 / 取舍 | 说明 |
| --- | --- |
| 生效延迟约 1 分钟 | 以重新部署换取零数据库成本，属有意取舍 |
| 单口令、无账号体系 | 单用户场景下的最小实现，避免过度设计 |
| 无频率限制 | 单用户自用，未引入登录限流；若公开域名被扫描，可后续追加 |
| 无图片上传 | 当前内容模型只承载文本；头像以外链或后续扩展字段实现 |
| 无草稿预览 | 保存即发布，不做草稿箱 |
| 占位数据 | 邮箱、GitHub、技能与 2 条项目为占位内容，前台已显式标注，需所有者替换 |

---

## 12. 验证记录

以下为本地开发环境实测结果（Next.js 16.4.2，Turbopack）。

| 编号 | 验证项 | 结果 |
| --- | --- | --- |
| V1 | 生产构建与类型检查 | 通过；`/` 与 `/admin` 为预渲染静态，API 路由按需渲染 |
| V2 | 前台渲染 | 首屏、项目、技能、联系四区块内容完整；浏览器控制台无报错、无警告 |
| V3 | 隐私校验 | 页面出现 `222023****`；完整学号字符串未出现在页面任意位置 |
| V4 | 未登录访问后台 | 仅渲染登录表单 |
| V5 | 错误口令登录 | 返回 401 |
| V6 | 未登录调用 `GET /api/content` | 返回 401 |
| V7 | 未登录调用 `PUT /api/content` | 返回 401 |
| V8 | 正确口令登录 | 返回 200，会话生效，编辑器加载全部三个分区 |
| V9 | 通过界面修改内容并保存 | 提示「本地开发模式：内容已写入 content/site.json」 |
| V10 | 落盘核对 | `content/site.json` 哈希发生变化，写入字段与界面一致 |
| V11 | 前台生效核对 | 刷新前台页面，修改内容已出现在页面上 |
| V12 | 登出 | 会话立即失效，`/api/auth/session` 返回 `authenticated: false` |
| V13 | 测试数据还原 | 文件哈希恢复至测试前原值，测试痕迹已清除 |
| V14 | 线上闭环 | 待部署后执行（对应 PRD 第 6 节未勾选项） |

### 12.1 实现过程中发现并修正的问题

| 问题 | 原因 | 处理 |
| --- | --- | --- |
| 构建报错：路由段配置 `dynamic` / `runtime` 与 `nextConfig.cacheComponents` 不兼容 | Next.js 16.4 默认启用 Cache Components，该类段配置被禁止 | 从 Route Handler 中移除这两个导出；Route Handler 在访问 Cookie（运行时数据）时自动按请求执行，无需显式声明 |
| 类型检查报错：数组 map 结果为 `T \| null` 无法赋给目标数组 | 校验函数中剔除非对象条目的分支未被类型收窄 | 为 map 回调显式标注返回类型 `Skill \| null` / `Project \| null`，并保留类型谓词过滤器 |

---

## 13. 后续可扩展方向

- 追加英文内容与语言切换（面向海外申请）；
- 项目详情页与截图（当前为列表内摘要）；
- 内容变更历史可视化（直接复用仓库提交记录）；
- 登录限流与失败告警。
