// app/admin/layout.tsx
import "@/app/globals.css";
import type { Metadata } from "next";
import AdminHeader from "@/components/admin/AdminHeader";

export const metadata: Metadata = {
  title: "관리자 페이지 | DeepGround",
  description: "DeepGround 관리자 전용 페이지입니다.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <AdminHeader />
      <main className="flex-1 px-4 py-6 max-w-screen-xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
