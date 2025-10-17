
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { FeatureCard } from "../_components/feature-card";

export default function UserManagementModulePage() {
  return (
    <div className="space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/help">Help</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>User Management Module</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="space-y-4">
        <FeatureCard title="How to add a new user">
          <p className="text-sm text-muted-foreground">
            To add a new user, go to the "Users" section in the admin panel. Click on the "Add User" button and fill in the user's details, including their name, email address, and role. You can also set a temporary password for the new user, which they will be prompted to change upon their first login.
          </p>
        </FeatureCard>
        <FeatureCard title="How to edit a user's role and permissions">
          <p className="text-sm text-muted-foreground">
            To edit a user's role and permissions, navigate to the "Users" section and select the user you want to modify. You can then change their role from a dropdown menu, which will automatically update their permissions based on the predefined settings for that role. You can also set custom permissions for each user.
          </p>
        </FeatureCard>
      </div>
    </div>
  );
}
