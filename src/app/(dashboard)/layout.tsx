import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import DashboardHeader from '@/components/layout/DashboardHeader';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-hero-gradient flex relative overflow-hidden">
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-brand-green/[0.06] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-brand-yellow/[0.08] rounded-full blur-3xl pointer-events-none" />
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-h-screen ml-64 relative">
        <DashboardHeader user={user} />
        <main className="flex-1 p-8 overflow-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}
