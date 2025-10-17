
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { FeatureCard } from "../_components/feature-card";

export default function AiModulePage() {
  return (
    <div className="space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/help">Help</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>AI Sales Gen Module</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="space-y-4">
        <FeatureCard title="How to use the 'Next Best Action' feature">
          <p className="text-sm text-muted-foreground">
            The "Next Best Action" feature provides AI-powered recommendations to help you close deals faster. To use this feature, navigate to the "Next Best Action" page from the sidebar. The page will display a list of suggested actions for your leads, such as sending a follow-up email or scheduling a meeting.
          </p>
        </FeatureCard>
      </div>
    </div>
  );
}
