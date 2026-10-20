import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "内容管理 · 王略帆",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
