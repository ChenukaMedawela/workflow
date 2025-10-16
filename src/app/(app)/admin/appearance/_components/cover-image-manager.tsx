
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CoverImageEditor } from "./cover-image-editor";
import Image from 'next/image';

interface CoverImageManagerProps {
    initialCoverImageUrl: string | null;
}

export function CoverImageManager({ initialCoverImageUrl }: CoverImageManagerProps) {
    const [coverImageUrl, setCoverImageUrl] = useState(initialCoverImageUrl);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cover Image</CardTitle>
                <CardDescription>
                    This image will be displayed on the login page.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-start gap-4">
                    {coverImageUrl ? (
                        <div className="relative w-full h-64 bg-muted rounded-md overflow-hidden">
                            <Image
                                src={coverImageUrl}
                                alt="Cover Image"
                                layout="fill"
                                objectFit="cover"
                            />
                        </div>
                    ) : (
                        <div className="w-full h-64 bg-muted rounded-md flex items-center justify-center">
                            <p className="text-sm text-muted-foreground">No cover image set.</p>
                        </div>
                    )}
                    <CoverImageEditor />
                </div>
            </CardContent>
        </Card>
    );
}
