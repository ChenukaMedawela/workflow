
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface ExpandingSearchProps extends React.HTMLAttributes<HTMLDivElement> {
    onSearch?: (query: string) => void;
}

export const ExpandingSearch = React.forwardRef<HTMLDivElement, ExpandingSearchProps>(
    ({ className, onSearch, ...props }, ref) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isExpanded) {
            inputRef.current?.focus();
        }
    }, [isExpanded]);

    const handleToggle = () => {
        setIsExpanded(prev => !prev);
    };

    const handleBlur = () => {
        if (!query) {
            setIsExpanded(false);
        }
    };
    
    const handleSearch = () => {
        if(onSearch) {
            onSearch(query);
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    }

    return (
        <div
            ref={ref}
            className={cn(
                "relative flex items-center transition-all duration-300 ease-in-out",
                isExpanded ? "w-64" : "w-10",
                className
            )}
            {...props}
        >
            <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 z-10"
                onClick={handleToggle}
            >
                <Search className="h-5 w-5" />
                <span className="sr-only">Search</span>
            </Button>
            <Input
                ref={inputRef}
                className={cn(
                    "absolute left-0 h-10 pr-4 pl-12 rounded-full border transition-all duration-300 ease-in-out",
                    isExpanded ? "w-full opacity-100" : "w-0 opacity-0"
                )}
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
        </div>
    );
});

ExpandingSearch.displayName = 'ExpandingSearch';
