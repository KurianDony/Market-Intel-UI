import { Suspense } from "react";
import { AreaDashboardContent } from "./AreaDashboardContent";
import { DashboardLoading } from "@/components/dashboard/DashboardLoading";

type Props = {
  params: Promise<{ state: string; area: string }>;
  searchParams: Promise<{ week?: string }>;
};

export default function AreaDashboardPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <AreaDashboardContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
