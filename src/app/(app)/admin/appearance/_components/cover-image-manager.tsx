
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CoverImageEditor } from "./cover-image-editor";
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface CoverImageManagerProps {
    initialCoverImageUrl: string | null;
}

export function CoverImageManager({ initialCoverImageUrl }: CoverImageManagerProps) {
    const [coverImageUrl, setCoverImageUrl] = useState(initialCoverImageUrl);

    const handleRemoveCoverImage = () => {
        setCoverImageUrl(null);
    };

    const handleUploadComplete = (url: string) => {
        setCoverImageUrl(url);
    }

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
                    <div className="flex items-center gap-2">
                        <CoverImageEditor onUploadComplete={handleUploadComplete} />
                        {coverImageUrl && (
                            <Button variant="destructive" size="sm" onClick={handleRemoveCoverImage}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
