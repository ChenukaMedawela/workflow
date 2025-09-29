
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

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

    const handleClear = () => {
        setQuery('');
        if(onSearch) {
            onSearch('');
        }
        inputRef.current?.focus();
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
            <div className={cn(
                    "absolute left-0 w-full h-10 transition-all duration-300 ease-in-out",
                    isExpanded ? "opacity-100" : "opacity-0"
                )}>
                <Input
                    ref={inputRef}
                    className="h-10 pr-10 pl-12 rounded-full border"
                    placeholder="Search..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                />
                {query && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full"
                        onClick={handleClear}
                    >
                        <X style={{ width: '7px', height: '7px' }} />
                        <span className="sr-only">Clear search</span>
                    </Button>
                )}
            </div>
        </div>
    );
});

ExpandingSearch.displayName = 'ExpandingSearch';
