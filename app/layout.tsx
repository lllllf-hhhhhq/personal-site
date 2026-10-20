import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "王略帆 · 软件工程 | 大连海事大学",
  description:
    "王略帆的个人作品集：大连海事大学软件工程专业 2023 级本科生，方向为 Web 工程与计算机系统基础。",
  authors: [{ name: "王略帆" }],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
