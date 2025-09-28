
import { cn } from "@/lib/utils";

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    description?: string;
    children?: React.ReactNode;
}

export function PageHeader({ title, description, children, className, ...props }: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6", className)} {...props}>
            <div className="grid gap-1 flex-1">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight uppercase">{title}</h1>
                {description && <p className="text-muted-foreground">{description}</p>}
            </div>
            {children && <div className="flex w-full md:w-auto items-center justify-start gap-2">{children}</div>}
        </div>
    );
}
