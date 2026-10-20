import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { SiteContent } from "@/lib/content";

export type SaveResult = {
  /** github：已提交到远端仓库；local：仅写入本地开发文件 */
  mode: "github" | "local";
  message: string;
  /** 提交记录地址，仅在 mode 为 github 时存在 */
  commitUrl?: string;
};

const CONTENT_FILE = "content/site.json";

function serialize(content: SiteContent): string {
  return `${JSON.stringify(content, null, 2)}\n`;
}

/**
 * 把内容写回代码仓库。线上依赖 GitHub Contents API，
 * 提交完成后由部署平台（Vercel / Cloudflare Pages）自动重新构建，
 * 从而使前台读到的 content/site.json 生效。
 */
export async function saveSiteContent(content: SiteContent): Promise<SaveResult> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (token && repo) {
    return saveViaGitHub(content, { token, repo, branch });
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "线上环境未配置 GITHUB_TOKEN / GITHUB_REPO，无法持久化修改。请在部署平台补齐这两个环境变量。",
    );
  }

  await writeFile(
    path.join(process.cwd(), CONTENT_FILE),
    serialize(content),
    "utf8",
  );

  return {
    mode: "local",
    message: "本地开发模式：内容已写入 content/site.json（未配置 GITHUB_TOKEN）。",
  };
}

async function saveViaGitHub(
  content: SiteContent,
  { token, repo, branch }: { token: string; repo: string; branch: string },
): Promise<SaveResult> {
  const endpoint = `https://api.github.com/repos/${repo}/contents/${CONTENT_FILE}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "personal-site-admin",
  };

  // Contents API 更新文件时必须带上当前文件的 sha
  const current = await fetch(`${endpoint}?ref=${encodeURIComponent(branch)}`, {
    headers,
    cache: "no-store",
  });

  let sha: string | undefined;
  if (current.ok) {
    const payload = (await current.json()) as { sha?: string };
    sha = payload.sha;
  } else if (current.status !== 404) {
    throw new Error(`读取远端 content/site.json 失败：HTTP ${current.status}`);
  }

  const response = await fetch(endpoint, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `chore(content): 后台更新站点内容 ${new Date().toISOString()}`,
      content: Buffer.from(serialize(content), "utf8").toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`提交到 GitHub 失败：HTTP ${response.status} ${detail.slice(0, 200)}`);
  }

  const result = (await response.json()) as { commit?: { html_url?: string } };
  return {
    mode: "github",
    commitUrl: result.commit?.html_url,
    message: `已提交到 ${repo}@${branch}，部署平台将自动重新构建（通常 1 分钟内生效）。`,
  };
}
