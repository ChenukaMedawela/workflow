
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FeatureCardProps {
  title: string;
  children: React.ReactNode;
}

export function FeatureCard({ title, children }: FeatureCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">{children}</div>
        <div className="bg-muted rounded-md flex items-center justify-center">
          <p className="text-muted-foreground">Image Placeholder</p>
        </div>
      </CardContent>
    </Card>
  );
}
