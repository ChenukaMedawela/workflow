
import React from 'react';

interface PageHeaderProps {
    title: string;
    description: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
    return (
        <div className="border-b border-border pb-5 mb-5">
            <h1 className="text-3xl font-bold leading-tight text-primary">{title}</h1>
            <p className="mt-2 max-w-4xl text-sm text-muted-foreground">{description}</p>
        </div>
    );
}
