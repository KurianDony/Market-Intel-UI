import { Suspense } from "react";
import { AreaDashboardContent } from "./AreaDashboardContent";
import { DashboardLoading } from "@/components/dashboard/DashboardLoading";

type Props = { params: Promise<{ state: string; area: string }> };

export default function AreaDashboardPage({ params }: Props) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <AreaDashboardContent params={params} />
    </Suspense>
  );
}
