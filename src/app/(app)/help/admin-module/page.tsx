
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { FeatureCard } from "../_components/feature-card";

export default function AdminModulePage() {
  return (
    <div className="space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/help">Help</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Admin Module</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="space-y-4">
        <FeatureCard title="How to view the audit trail">
          <p className="text-sm text-muted-foreground">
            The audit trail logs all actions performed within the application, providing a complete history of user activity. To view the audit trail, go to the "Audit Trail" section in the admin panel. You can filter the logs by user, action, and date range to find specific events.
          </p>
        </FeatureCard>
        <FeatureCard title="How to customize the application's appearance">
          <p className="text-sm text-muted-foreground">
            You can customize the application's appearance to match your company's branding. In the admin panel, go to the "Appearance" section. From there, you can upload your company logo, change the color scheme, and customize other visual elements of the application.
          </p>
        </FeatureCard>
      </div>
    </div>
  );
}
