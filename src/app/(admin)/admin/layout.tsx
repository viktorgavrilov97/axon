import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/lib/auth";
import { AdminSidebar } from "./admin-sidebar";
import { Suspense } from "react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/email");
  }

  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    redirect("/operations");
  }

  return (
    <div className="flex min-h-screen">
      {/* Fixed Sidebar */}
      <AdminSidebar isSuperAdmin={user.role === "SUPERADMIN"} />

      {/* Main Content */}
      <div className="flex-1 ml-80 h-screen p-2">
        <main className="h-full bg-black rounded-2xl overflow-auto">
          <Suspense fallback={
            <div className="min-h-screen p-8">
              <div className="animate-pulse space-y-8">
                <div className="h-10 bg-onsurface-900 rounded w-48"></div>
                <div className="h-32 bg-onsurface-900 rounded"></div>
              </div>
            </div>
          }>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

