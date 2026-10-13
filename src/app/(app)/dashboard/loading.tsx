import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <DashboardSkeleton />
    </div>
  );
}
