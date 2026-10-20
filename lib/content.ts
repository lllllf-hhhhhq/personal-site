import siteJson from "@/content/site.json";

export type Profile = {
  name: string;
  nameEn: string;
  headline: string;
  school: string;
  schoolEn: string;
  major: string;
  grade: string;
  /** 对外展示的学号，末四位已打码 */
  studentIdMasked: string;
  location: string;
  email: string;
  github: string;
  bio: string;
};

export type Skill = {
  name: string;
  category: string;
  note: string;
  /** 占位内容标记，前台会据此提示「示例」 */
  draft?: boolean;
};

export type Project = {
  title: string;
  period: string;
  role: string;
  summary: string;
  highlights: string[];
  tags: string[];
  link: string;
  repo: string;
  /** 占位内容标记，前台会据此提示「示例」 */
  draft?: boolean;
};

export type SiteContent = {
  profile: Profile;
  skills: Skill[];
  projects: Project[];
  meta: { updatedAt: string };
};

/**
 * 前台读取的内容源。该 JSON 随构建打包进产物，
 * 因此后台把内容提交回仓库后，部署平台会重新构建并生效。
 */
export const content = siteJson as SiteContent;

/* ------------------------------ 写入侧校验 ------------------------------ */

const MAX = {
  short: 60,
  medium: 200,
  long: 600,
  items: 16,
  item: 200,
};

export type ValidationResult =
  | { ok: true; value: SiteContent }
  | { ok: false; error: string };

function readText(
  value: unknown,
  limit: number,
  label: string,
  errors: string[],
  required = false,
): string {
  if (value === undefined || value === null) {
    if (required) errors.push(`${label}缺失`);
    return "";
  }
  if (typeof value !== "string") {
    errors.push(`${label}必须是文本`);
    return "";
  }
  const text = value.trim();
  if (!text) {
    if (required) errors.push(`${label}不能为空`);
    return "";
  }
  if (text.length > limit) {
    errors.push(`${label}超过 ${limit} 字上限`);
    return text.slice(0, limit);
  }
  return text;
}

function readList(
  value: unknown,
  label: string,
  errors: string[],
  maxItems = MAX.items,
  maxLength = MAX.item,
): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    errors.push(`${label}必须是数组`);
    return [];
  }
  return value
    .slice(0, maxItems)
    .map((item) => readText(item, maxLength, `${label}的条目`, errors))
    .filter((item) => item.length > 0);
}

function readBoolean(value: unknown): boolean {
  return value === true;
}

/**
 * 后台提交的内容属于系统边界输入，需完整校验后再落库，
 * 避免污染前台渲染所依赖的数据结构。
 */
export function validateSiteContent(input: unknown): ValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "提交内容必须是对象" };
  }

  const errors: string[] = [];
  const raw = input as Record<string, unknown>;

  const rawProfile = raw.profile;
  if (typeof rawProfile !== "object" || rawProfile === null) {
    return { ok: false, error: "缺少 profile 字段" };
  }
  const p = rawProfile as Record<string, unknown>;

  const profile: Profile = {
    name: readText(p.name, MAX.short, "姓名", errors, true),
    nameEn: readText(p.nameEn, MAX.short, "英文名", errors),
    headline: readText(p.headline, MAX.medium, "一句话简介", errors),
    school: readText(p.school, MAX.short, "学校", errors),
    schoolEn: readText(p.schoolEn, MAX.short, "学校英文名", errors),
    major: readText(p.major, MAX.short, "专业", errors),
    grade: readText(p.grade, MAX.short, "年级", errors),
    studentIdMasked: readText(p.studentIdMasked, MAX.short, "对外学号", errors),
    location: readText(p.location, MAX.short, "所在地", errors),
    email: readText(p.email, MAX.medium, "邮箱", errors),
    github: readText(p.github, MAX.medium, "GitHub 地址", errors),
    bio: readText(p.bio, MAX.long, "个人简介", errors),
  };

  const rawSkills = raw.skills;
  if (rawSkills !== undefined && !Array.isArray(rawSkills)) {
    errors.push("skills 必须是数组");
  }
  const skills: Skill[] = (Array.isArray(rawSkills) ? rawSkills : [])
    .slice(0, 40)
    .map((item, index): Skill | null => {
      if (typeof item !== "object" || item === null) {
        errors.push(`第 ${index + 1} 条技能格式错误`);
        return null;
      }
      const s = item as Record<string, unknown>;
      return {
        name: readText(s.name, MAX.short, `第 ${index + 1} 条技能名称`, errors, true),
        category: readText(s.category, MAX.short, `第 ${index + 1} 条技能分类`, errors) || "其他",
        note: readText(s.note, MAX.medium, `第 ${index + 1} 条技能说明`, errors),
        draft: readBoolean(s.draft),
      };
    })
    .filter((item): item is Skill => item !== null && item.name.length > 0);

  const rawProjects = raw.projects;
  if (rawProjects !== undefined && !Array.isArray(rawProjects)) {
    errors.push("projects 必须是数组");
  }
  const projects: Project[] = (Array.isArray(rawProjects) ? rawProjects : [])
    .slice(0, 24)
    .map((item, index): Project | null => {
      if (typeof item !== "object" || item === null) {
        errors.push(`第 ${index + 1} 个项目格式错误`);
        return null;
      }
      const pr = item as Record<string, unknown>;
      return {
        title: readText(pr.title, MAX.medium, `第 ${index + 1} 个项目名称`, errors, true),
        period: readText(pr.period, MAX.short, `第 ${index + 1} 个项目时间`, errors),
        role: readText(pr.role, MAX.short, `第 ${index + 1} 个项目角色`, errors),
        summary: readText(pr.summary, MAX.long, `第 ${index + 1} 个项目简介`, errors),
        highlights: readList(pr.highlights, `第 ${index + 1} 个项目要点`, errors),
        tags: readList(pr.tags, `第 ${index + 1} 个项目标签`, errors),
        link: readText(pr.link, MAX.medium, `第 ${index + 1} 个项目链接`, errors),
        repo: readText(pr.repo, MAX.medium, `第 ${index + 1} 个项目仓库`, errors),
        draft: readBoolean(pr.draft),
      };
    })
    .filter((item): item is Project => item !== null && item.title.length > 0);

  if (errors.length > 0) {
    return { ok: false, error: errors.slice(0, 5).join("；") };
  }

  return {
    ok: true,
    value: {
      profile,
      skills,
      projects,
      meta: { updatedAt: new Date().toISOString().slice(0, 10) },
    },
  };
}
