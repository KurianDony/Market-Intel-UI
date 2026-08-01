import { Suspense } from "react";
import { SuburbDashboardContent } from "./SuburbDashboardContent";
import { DashboardLoading } from "@/components/dashboard/DashboardLoading";

type Props = {
  params: Promise<{ state: string; area: string; suburb: string }>;
  searchParams: Promise<{ week?: string }>;
};

export default function SuburbDashboardPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <SuburbDashboardContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
