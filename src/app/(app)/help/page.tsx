
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">How can we help you today?</h1>
        <div className="flex w-full max-w-sm mx-auto items-center space-x-2">
          <Input type="text" placeholder="Search here" />
          <Button type="submit">Search</Button>
        </div>
      </div>
      <div className="text-center">
        <p className="text-muted-foreground">Select a module from the left to get started.</p>
      </div>
    </div>
  );
}
