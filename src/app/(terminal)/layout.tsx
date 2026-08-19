import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { Sidebar } from "./sidebar";
import { Suspense } from "react";
import { RealtimeProvider } from "@/shared/lib/realtime-context";
import { Toaster } from "react-hot-toast";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Check onboarding completion and get user data
  const userData = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      displayName: true,
      avatarUrl: true,
      avatarColor: true,
      hasCompletedOnboarding: true,
    },
  });

  if (!userData) {
    redirect("/login");
  }

  // Redirect to onboarding if not completed
  if (!userData.displayName || !userData.hasCompletedOnboarding) {
    redirect("/onboarding");
  }

  return (
    <RealtimeProvider>
    <div className="flex min-h-screen">
      {/* Fixed Sidebar */}
      <Sidebar 
        userRole={user.role as "USER" | "ADMIN" | "SUPERADMIN"}
        user={{
          id: userData.id,
          email: userData.email,
          name: userData.name,
          displayName: userData.displayName,
          avatarUrl: userData.avatarUrl,
          avatarColor: userData.avatarColor,
        }}
      />

      {/* Main Content */}
      <div className="flex-1 min-w-0 sidebar:ml-80 sidebar:ml-[240px] sidebar-lg:ml-[320px] sidebar:h-screen pb-16 sidebar:pb-2 p-2">
        <main className="h-full min-w-0 bg-black rounded-2xl overflow-y-auto overflow-x-hidden">
          <Suspense fallback={
            <div className="min-h-screen p-4">
              <div className="animate-pulse space-y-6">
                <div className="h-8 bg-onsurface-900 rounded-xl w-48"></div>
                <div className="h-32 bg-onsurface-900 rounded-xl"></div>
              </div>
            </div>
          }>
            {children}
          </Suspense>
        </main>
      </div>
      <Toaster 
        position="bottom-right"
        containerStyle={{
          zIndex: 10002,
        }}
        toastOptions={{
          style: {
            background: 'rgba(26, 26, 26, 0.8)',
            color: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid rgba(42, 42, 42, 0.5)',
            borderRadius: '9999px',
            fontSize: '14px',
            padding: '14px',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 10002,
          },
          success: {
            iconTheme: {
              primary: 'rgba(255, 255, 255, 0.8)',
              secondary: 'rgba(26, 26, 26, 0.8)',
            },
          },
          error: {
            iconTheme: {
              primary: 'rgba(255, 255, 255, 0.8)',
              secondary: 'rgba(26, 26, 26, 0.8)',
            },
          },
        }}
      />
    </div>
    </RealtimeProvider>
  );
}

