import { Suspense } from "react";
import { SuburbDashboardContent } from "./SuburbDashboardContent";
import { DashboardLoading } from "@/components/dashboard/DashboardLoading";

type Props = { params: Promise<{ state: string; area: string; suburb: string }> };

export default function SuburbDashboardPage({ params }: Props) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <SuburbDashboardContent params={params} />
    </Suspense>
  );
}
