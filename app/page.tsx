import Link from "next/link";
import { content, type Project, type Skill } from "@/lib/content";
import styles from "./page.module.css";

function SectionHead({
  index,
  title,
  id,
}: {
  index: string;
  title: string;
  id: string;
}) {
  return (
    <header className={styles.sectionHead}>
      <span className={`mono ${styles.sectionNum}`} aria-hidden="true">
        {index}
      </span>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
    </header>
  );
}

function SkillGroups({ skills }: { skills: Skill[] }) {
  const groups: Record<string, Skill[]> = {};
  for (const skill of skills) {
    if (!groups[skill.category]) groups[skill.category] = [];
    groups[skill.category].push(skill);
  }

  return (
    <div className={styles.skillGroups}>
      {Object.entries(groups).map(([category, items]) => (
        <div key={category} className={styles.skillGroup}>
          <h3 className={styles.skillCategory}>{category}</h3>
          <dl className={styles.skillList}>
            {items.map((skill) => (
              <div key={`${skill.category}-${skill.name}`} className={styles.skillRow}>
                <dt className={styles.skillName}>{skill.name}</dt>
                {skill.note ? <dd className={styles.skillNote}>{skill.note}</dd> : null}
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

function ProjectEntry({ project, index }: { project: Project; index: number }) {
  return (
    <li className={styles.project}>
      <span className={`mono ${styles.projectIndex}`} aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className={styles.projectMain}>
        <div className={styles.projectHead}>
          <h3 className={styles.projectTitle}>{project.title}</h3>
          {project.period ? (
            <span className={`mono ${styles.projectPeriod}`}>{project.period}</span>
          ) : null}
        </div>

        {project.role ? <p className={styles.projectRole}>{project.role}</p> : null}
        {project.summary ? (
          <p className={styles.projectSummary}>{project.summary}</p>
        ) : null}

        {project.highlights.length > 0 ? (
          <ul className={styles.highlights}>
            {project.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        ) : null}

        {project.tags.length > 0 ? (
          <ul className={styles.tagList}>
            {project.tags.map((tag) => (
              <li key={tag} className="tag">
                {tag}
              </li>
            ))}
          </ul>
        ) : null}

        {project.link || project.repo ? (
          <p className={styles.projectLinks}>
            {project.link ? (
              <a href={project.link} target="_blank" rel="noreferrer noopener">
                在线访问
              </a>
            ) : null}
            {project.repo ? (
              <a href={project.repo} target="_blank" rel="noreferrer noopener">
                源码仓库
              </a>
            ) : null}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export default function Home() {
  const { profile, skills, projects, meta } = content;

  const hasDraftSkill = skills.some((skill) => skill.draft);
  const hasDraftProject = projects.some((project) => project.draft);
  const emailIsPlaceholder = profile.email.endsWith("@example.com");
  const updatedAt = meta.updatedAt.replaceAll("-", ".");

  return (
    <>
      <a className={styles.skipLink} href="#main">
        跳到主要内容
      </a>

      <header className={styles.siteHeader}>
        <div className={`container ${styles.headerInner}`}>
          <Link href="/" className={styles.brand}>
            {profile.name}
            <span className={`mono ${styles.brandMark}`}>{profile.nameEn}</span>
          </Link>
          <nav className={styles.nav} aria-label="站内导航">
            <a className={styles.navLink} href="#about">
              关于
            </a>
            <a className={styles.navLink} href="#projects">
              项目
            </a>
            <a className={styles.navLink} href="#skills">
              技能
            </a>
            <a className={styles.navLink} href="#contact">
              联系
            </a>
          </nav>
        </div>
      </header>

      <main id="main">
        <div className="container">
          <section className={styles.hero} aria-labelledby="hero-title">
            <div className={styles.heroMain}>
              <p className={`mono ${styles.eyebrow}`}>
                {profile.schoolEn}
                <span className={styles.eyebrowDot} aria-hidden="true" />
                {profile.school}
              </p>

              <h1 id="hero-title" className={styles.name}>
                {profile.name}
                <span className={styles.nameEn}>{profile.nameEn}</span>
              </h1>

              <p className={styles.headline}>{profile.headline}</p>

              <ul className={styles.heroMeta}>
                <li>
                  {profile.major} · {profile.grade}
                </li>
                <li>{profile.location}</li>
                <li className="mono">{profile.studentIdMasked}</li>
              </ul>

              <div className={styles.heroActions}>
                <a className="btn btn-primary" href={`mailto:${profile.email}`}>
                  发送邮件
                </a>
                {profile.github ? (
                  <a
                    className="btn"
                    href={profile.github}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    GitHub
                  </a>
                ) : null}
              </div>
            </div>

            <aside className={styles.heroAside} aria-label="身份信息">
              <div className={styles.monogram} aria-hidden="true">
                王
              </div>
              <dl className={styles.idCard}>
                <div className={styles.idRow}>
                  <dt className={styles.idKey}>学校</dt>
                  <dd className={styles.idValue}>{profile.school}</dd>
                </div>
                <div className={styles.idRow}>
                  <dt className={styles.idKey}>专业</dt>
                  <dd className={styles.idValue}>{profile.major}</dd>
                </div>
                <div className={styles.idRow}>
                  <dt className={styles.idKey}>年级</dt>
                  <dd className={styles.idValue}>{profile.grade}</dd>
                </div>
                <div className={styles.idRow}>
                  <dt className={styles.idKey}>学号</dt>
                  <dd className={`mono ${styles.idValue}`}>{profile.studentIdMasked}</dd>
                </div>
              </dl>
              <p className={styles.idHint}>学号末四位已做打码处理。</p>
            </aside>
          </section>

          <div className={styles.chartline} aria-hidden="true" />

          <section className={styles.section} aria-labelledby="about-title">
            <SectionHead index="01" title="关于" id="about-title" />
            <div className={styles.sectionBody}>
              <p className={styles.bio}>{profile.bio}</p>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="projects-title">
            <SectionHead index="02" title="项目" id="projects-title" />
            <div className={styles.sectionBody}>
              {hasDraftProject ? (
                <p className={`notice ${styles.sectionNotice}`}>
                  <span>
                    含占位条目。真实项目请在
                    <Link href="/admin"> 管理后台 </Link>
                    的「项目」标签页中替换：写清楚做了什么、用到什么技术、结果如何。
                  </span>
                </p>
              ) : null}

              {projects.length > 0 ? (
                <ul className={styles.projects}>
                  {projects.map((project, index) => (
                    <ProjectEntry
                      key={`${project.title}-${index}`}
                      project={project}
                      index={index}
                    />
                  ))}
                </ul>
              ) : (
                <p className={styles.empty}>暂无项目记录。</p>
              )}
            </div>
          </section>

          <section className={styles.section} aria-labelledby="skills-title">
            <SectionHead index="03" title="技能" id="skills-title" />
            <div className={styles.sectionBody}>
              {hasDraftSkill ? (
                <p className={`notice ${styles.sectionNotice}`}>
                  <span>以下为示例条目，请按你的实际情况在管理后台增删改。</span>
                </p>
              ) : null}

              {skills.length > 0 ? (
                <SkillGroups skills={skills} />
              ) : (
                <p className={styles.empty}>暂无技能记录。</p>
              )}
            </div>
          </section>

          <section className={styles.section} aria-labelledby="contact-title">
            <SectionHead index="04" title="联系" id="contact-title" />
            <div className={styles.sectionBody}>
              <p className={styles.contactLead}>
                如果你在招收实习生、需要协作，或只是想聊聊技术，欢迎直接写信。
              </p>

              <p className={styles.contactMail}>
                <a href={`mailto:${profile.email}`}>{profile.email}</a>
                {emailIsPlaceholder ? (
                  <span className={`tag ${styles.placeholderTag}`}>占位，待替换</span>
                ) : null}
              </p>

              <p className={styles.contactLinks}>
                {profile.github ? (
                  <a href={profile.github} target="_blank" rel="noreferrer noopener">
                    GitHub
                  </a>
                ) : null}
                <Link href="/admin">管理后台</Link>
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer className={styles.siteFooter}>
        <div className={`container ${styles.footerInner}`}>
          <p className={styles.footerMeta}>
            <span className="mono">{updatedAt}</span> 更新
            <span className={styles.footerDot} aria-hidden="true" />
            {profile.school} · {profile.major}
          </p>
          <p className={styles.footerMeta}>
            内容由后台维护，变更后自动重新部署。
          </p>
        </div>
      </footer>
    </>
  );
}
