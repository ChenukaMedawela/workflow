
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PendingApprovalPage() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Account Pending Approval</CardTitle>
                    <CardDescription>
                        Your account has been successfully created and is now awaiting approval from an administrator.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p>You will be notified by email once your account has been reviewed and approved.</p>
                    <p className="mt-4">Thank you for your patience.</p>
                </CardContent>
            </Card>
        </div>
    );
}
