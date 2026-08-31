import { ListCard } from "@/components/widgets/ListCard";

export interface PendingApproval {
  key: string;
  title: string;
  riskLevel: string;
  href: string;
}

export function PendingApprovalsCard({
  approvals,
  viewAllHref,
}: {
  approvals: PendingApproval[];
  viewAllHref: string;
}) {
  return (
    <ListCard
      title="Pending decisions"
      viewAllHref={viewAllHref}
      emptyMessage="No decisions pending approval."
      items={approvals.map((approval) => ({
        key: approval.key,
        title: approval.title,
        supportingLine: `Risk level: ${approval.riskLevel}`,
        href: approval.href,
      }))}
    />
  );
}
