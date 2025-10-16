
import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbsProps {
    parent: string;
    parentHref: string;
    current: string;
}

export function Breadcrumbs({ parent, parentHref, current }: BreadcrumbsProps) {
    return (
        <nav className="flex" aria-label="Breadcrumb">
            <ol role="list" className="flex items-center space-x-4">
                <li>
                    <div>
                        <Link href={parentHref} className="text-sm font-medium text-muted-foreground hover:text-foreground">
                            {parent}
                        </Link>
                    </div>
                </li>
                <li>
                    <div className="flex items-center">
                        <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                        <span className="ml-4 text-sm font-medium text-foreground">
                            {current}
                        </span>
                    </div>
                </li>
            </ol>
        </nav>
    );
}
