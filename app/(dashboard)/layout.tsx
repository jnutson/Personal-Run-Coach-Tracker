import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen p-3 gap-3 bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto rounded-3xl bg-card [box-shadow:var(--shadow-card)]">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
