import AdminNav from "@/components/AdminNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-courtLine">
      <AdminNav />
      <div className="max-w-5xl mx-auto px-6 py-10">{children}</div>
    </div>
  );
}
