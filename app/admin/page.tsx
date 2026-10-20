"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { Profile, Project, SiteContent, Skill } from "@/lib/content";
import styles from "./admin.module.css";

type ProjectForm = Omit<Project, "highlights" | "tags"> & {
  highlights: string;
  tags: string;
};

type FormState = {
  profile: Profile;
  skills: Skill[];
  projects: ProjectForm[];
};

type Status = "checking" | "anonymous" | "authed";
type Tab = "profile" | "skills" | "projects";
type Message = { kind: "ok" | "error"; text: string; url?: string };

const TABS: { key: Tab; label: string }[] = [
  { key: "profile", label: "基本信息" },
  { key: "skills", label: "技能" },
  { key: "projects", label: "项目" },
];

const PROFILE_FIELDS: {
  key: keyof Profile;
  label: string;
  hint?: string;
  multiline?: boolean;
}[] = [
  { key: "name", label: "姓名" },
  { key: "nameEn", label: "英文名" },
  { key: "headline", label: "一句话简介", hint: "一句话说清你是谁、在做什么，建议不超过 40 字。" },
  { key: "school", label: "学校" },
  { key: "schoolEn", label: "学校英文名" },
  { key: "major", label: "专业" },
  { key: "grade", label: "年级" },
  {
    key: "studentIdMasked",
    label: "对外学号",
    hint: "公网页面建议保留打码（如 222023****），不要暴露完整学号。",
  },
  { key: "location", label: "所在地" },
  { key: "email", label: "联系邮箱" },
  { key: "github", label: "GitHub 主页" },
  { key: "bio", label: "个人简介", multiline: true, hint: "两三句话即可，讲清方向与做事方式。" },
];

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitTags(value: string): string[] {
  return value
    .split(/[\r\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toForm(data: SiteContent): FormState {
  return {
    profile: { ...data.profile },
    skills: data.skills.map((skill) => ({ ...skill })),
    projects: data.projects.map((project) => ({
      ...project,
      highlights: project.highlights.join("\n"),
      tags: project.tags.join("\n"),
    })),
  };
}

function fromForm(form: FormState): SiteContent {
  return {
    profile: form.profile,
    skills: form.skills,
    projects: form.projects.map((project) => ({
      ...project,
      highlights: splitLines(project.highlights),
      tags: splitTags(project.tags),
    })),
    meta: { updatedAt: new Date().toISOString().slice(0, 10) },
  };
}

function TextField({
  id,
  label,
  value,
  onChange,
  hint,
  placeholder,
  multiline,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div className={styles.fieldWrap}>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          className="field"
          rows={4}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          className="field"
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </div>
  );
}

export default function AdminPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [tab, setTab] = useState<Tab>("profile");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const loadContent = useCallback(async () => {
    const response = await fetch("/api/content", { cache: "no-store" });
    if (!response.ok) {
      setStatus("anonymous");
      return;
    }
    const data = (await response.json()) as { content: SiteContent };
    setForm(toForm(data.content));
    setStatus("authed");
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { authenticated?: boolean }) => {
        if (cancelled) return;
        if (data.authenticated) {
          return loadContent();
        }
        setStatus("anonymous");
      })
      .catch(() => {
        if (!cancelled) setStatus("anonymous");
      });

    return () => {
      cancelled = true;
    };
  }, [loadContent]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setLoginError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        setLoginError(data.error ?? "登录失败，请重试。");
        return;
      }

      setPassword("");
      await loadContent();
    } catch {
      setLoginError("网络请求失败，请检查连接后重试。");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setForm(null);
    setMessage(null);
    setStatus("anonymous");
  }

  async function handleSave() {
    if (!form) return;
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: fromForm(form) }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        result?: { message: string; commitUrl?: string };
      };

      if (!response.ok || !data.ok) {
        setMessage({ kind: "error", text: data.error ?? "保存失败。" });
        return;
      }

      setMessage({
        kind: "ok",
        text: data.result?.message ?? "保存成功。",
        url: data.result?.commitUrl,
      });
    } catch {
      setMessage({ kind: "error", text: "网络请求失败，请检查连接后重试。" });
    } finally {
      setBusy(false);
    }
  }

  function updateProfile<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm((current) =>
      current
        ? { ...current, profile: { ...current.profile, [key]: value } as Profile }
        : current,
    );
  }

  function updateSkill(index: number, patch: Partial<Skill>) {
    setForm((current) =>
      current
        ? {
            ...current,
            skills: current.skills.map((skill, i) =>
              i === index ? { ...skill, ...patch } : skill,
            ),
          }
        : current,
    );
  }

  function updateProject(index: number, patch: Partial<ProjectForm>) {
    setForm((current) =>
      current
        ? {
            ...current,
            projects: current.projects.map((project, i) =>
              i === index ? { ...project, ...patch } : project,
            ),
          }
        : current,
    );
  }

  if (status === "checking") {
    return (
      <main className={styles.gate}>
        <p className={styles.gateText}>正在校验登录状态…</p>
      </main>
    );
  }

  if (status === "anonymous") {
    return (
      <main className={styles.gate}>
        <div className={styles.gateCard}>
          <p className={`mono ${styles.gateEyebrow}`}>ADMIN</p>
          <h1 className={styles.gateTitle}>内容管理后台</h1>
          <p className={styles.gateLead}>
            输入管理口令后可编辑前台展示的个人信息、技能与项目。修改会写回代码仓库并触发自动重新部署。
          </p>

          <form className={styles.gateForm} onSubmit={handleLogin}>
            <div className={styles.fieldWrap}>
              <label className="label" htmlFor="admin-password">
                管理口令
              </label>
              <input
                id="admin-password"
                className="field"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {loginError ? (
              <p className={styles.gateError} role="alert">
                {loginError}
              </p>
            ) : null}

            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "登录中…" : "登录"}
            </button>
          </form>

          <p className={styles.gateBack}>
            <Link href="/">返回个人主页</Link>
          </p>
        </div>
      </main>
    );
  }

  if (!form) {
    return null;
  }

  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <div className={`container ${styles.barInner}`}>
          <div className={styles.barLeft}>
            <p className={`mono ${styles.barEyebrow}`}>ADMIN</p>
            <h1 className={styles.barTitle}>内容管理</h1>
          </div>
          <div className={styles.barRight}>
            <Link className="btn" href="/" target="_blank">
              查看前台
            </Link>
            <button className="btn" type="button" onClick={handleLogout}>
              退出登录
            </button>
          </div>
        </div>
      </header>

      <main className={`container ${styles.main}`}>
        <p className="notice">
          <span>
            保存后，内容会通过 GitHub Contents API 提交到仓库，部署平台随后自动重新构建（通常 1 分钟内生效）。
            本地开发未配置 GITHUB_TOKEN 时，则直接写入 content/site.json。
          </span>
        </p>

        <div className={styles.tabs} role="group" aria-label="编辑分区">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={styles.tab}
              aria-pressed={tab === item.key}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "profile" ? (
          <section className={styles.panel} aria-label="基本信息">
            <div className={styles.grid2}>
              {PROFILE_FIELDS.map((field) => (
                <TextField
                  key={field.key}
                  id={`profile-${field.key}`}
                  label={field.label}
                  value={String(form.profile[field.key] ?? "")}
                  hint={field.hint}
                  multiline={field.multiline}
                  onChange={(value) => updateProfile(field.key, value)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {tab === "skills" ? (
          <section className={styles.panel} aria-label="技能">
            <div className={styles.panelHead}>
              <p className={styles.panelLead}>
                建议按「编程语言 / Web 开发 / 数据与存储 / 工程能力」等分类组织，说明写清是用在课程、项目还是比赛里。
              </p>
              <button
                className="btn"
                type="button"
                onClick={() =>
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          skills: [
                            ...current.skills,
                            { name: "", category: "其他", note: "", draft: false },
                          ],
                        }
                      : current,
                  )
                }
              >
                新增技能
              </button>
            </div>

            {form.skills.length === 0 ? (
              <p className={styles.empty}>暂无技能条目。</p>
            ) : null}

            <div className={styles.rows}>
              {form.skills.map((skill, index) => (
                <div key={index} className={styles.rowCard}>
                  <div className={styles.rowHead}>
                    <span className={`mono ${styles.rowIndex}`}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <button
                      className="btn btn-danger"
                      type="button"
                      onClick={() =>
                        setForm((current) =>
                          current
                            ? {
                                ...current,
                                skills: current.skills.filter((_, i) => i !== index),
                              }
                            : current,
                        )
                      }
                    >
                      删除
                    </button>
                  </div>

                  <div className={styles.grid3}>
                    <TextField
                      id={`skill-name-${index}`}
                      label="名称"
                      value={skill.name}
                      onChange={(value) => updateSkill(index, { name: value })}
                    />
                    <TextField
                      id={`skill-category-${index}`}
                      label="分类"
                      value={skill.category}
                      onChange={(value) => updateSkill(index, { category: value })}
                    />
                    <TextField
                      id={`skill-note-${index}`}
                      label="说明"
                      value={skill.note}
                      onChange={(value) => updateSkill(index, { note: value })}
                    />
                  </div>

                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={Boolean(skill.draft)}
                      onChange={(event) =>
                        updateSkill(index, { draft: event.target.checked })
                      }
                    />
                    <span>
                      标记为占位内容
                      <span className={styles.checkboxHint}>
                        勾选后前台会提示「示例条目」，替换成真实内容后请取消勾选。
                      </span>
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {tab === "projects" ? (
          <section className={styles.panel} aria-label="项目">
            <div className={styles.panelHead}>
              <p className={styles.panelLead}>
                把之前做过的网站搬进来：写清项目解决的问题、你负责的部分、用的技术、可验证的结果。建议 3 到 5 个。
              </p>
              <button
                className="btn"
                type="button"
                onClick={() =>
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          projects: [
                            ...current.projects,
                            {
                              title: "",
                              period: "",
                              role: "",
                              summary: "",
                              highlights: "",
                              tags: "",
                              link: "",
                              repo: "",
                              draft: false,
                            },
                          ],
                        }
                      : current,
                  )
                }
              >
                新增项目
              </button>
            </div>

            {form.projects.length === 0 ? (
              <p className={styles.empty}>暂无项目条目。</p>
            ) : null}

            <div className={styles.rows}>
              {form.projects.map((project, index) => (
                <div key={index} className={styles.rowCard}>
                  <div className={styles.rowHead}>
                    <span className={`mono ${styles.rowIndex}`}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <button
                      className="btn btn-danger"
                      type="button"
                      onClick={() =>
                        setForm((current) =>
                          current
                            ? {
                                ...current,
                                projects: current.projects.filter((_, i) => i !== index),
                              }
                            : current,
                        )
                      }
                    >
                      删除
                    </button>
                  </div>

                  <div className={styles.grid3}>
                    <TextField
                      id={`project-title-${index}`}
                      label="项目名称"
                      value={project.title}
                      onChange={(value) => updateProject(index, { title: value })}
                    />
                    <TextField
                      id={`project-period-${index}`}
                      label="时间"
                      value={project.period}
                      placeholder="2025 春"
                      onChange={(value) => updateProject(index, { period: value })}
                    />
                    <TextField
                      id={`project-role-${index}`}
                      label="角色"
                      value={project.role}
                      placeholder="独立开发 / 前端负责人"
                      onChange={(value) => updateProject(index, { role: value })}
                    />
                  </div>

                  <TextField
                    id={`project-summary-${index}`}
                    label="项目简介"
                    value={project.summary}
                    multiline
                    onChange={(value) => updateProject(index, { summary: value })}
                  />

                  <div className={styles.grid2}>
                    <TextField
                      id={`project-highlights-${index}`}
                      label="要点（每行一条）"
                      value={project.highlights}
                      multiline
                      hint="2 到 3 条即可，写具体的技术选择与结果。"
                      onChange={(value) => updateProject(index, { highlights: value })}
                    />
                    <TextField
                      id={`project-tags-${index}`}
                      label="技术标签（每行一个或用逗号分隔）"
                      value={project.tags}
                      multiline
                      onChange={(value) => updateProject(index, { tags: value })}
                    />
                  </div>

                  <div className={styles.grid2}>
                    <TextField
                      id={`project-link-${index}`}
                      label="在线地址（可留空）"
                      value={project.link}
                      onChange={(value) => updateProject(index, { link: value })}
                    />
                    <TextField
                      id={`project-repo-${index}`}
                      label="仓库地址（可留空）"
                      value={project.repo}
                      onChange={(value) => updateProject(index, { repo: value })}
                    />
                  </div>

                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={Boolean(project.draft)}
                      onChange={(event) =>
                        updateProject(index, { draft: event.target.checked })
                      }
                    />
                    <span>
                      标记为占位内容
                      <span className={styles.checkboxHint}>
                        勾选后前台会提示「含占位条目」，替换成真实项目后请取消勾选。
                      </span>
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <div className={styles.actionBar}>
        <div className={`container ${styles.actionInner}`}>
          <div className={styles.actionMessage} aria-live="polite">
            {message ? (
              <p
                className={
                  message.kind === "ok" ? styles.messageOk : styles.messageError
                }
              >
                {message.text}
                {message.url ? (
                  <>
                    {" "}
                    <a href={message.url} target="_blank" rel="noreferrer noopener">
                      查看提交记录
                    </a>
                  </>
                ) : null}
              </p>
            ) : (
              <p className={styles.messageIdle}>修改后请点击右侧「保存并部署」。</p>
            )}
          </div>

          <div className={styles.actionButtons}>
            <button
              className="btn"
              type="button"
              disabled={busy}
              onClick={() => {
                setMessage(null);
                void loadContent();
              }}
            >
              放弃修改
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={busy}
              onClick={handleSave}
            >
              {busy ? "保存中…" : "保存并部署"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
