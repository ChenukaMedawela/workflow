
'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Cropper, CropperRef } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from "firebase/storage";
import { doc, setDoc } from 'firebase/firestore';
import { db, app } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';
import { logAudit } from '@/lib/audit-log';
import { useAuth } from '@/hooks/use-auth';

const storage = getStorage(app);

interface CoverImageEditorProps {
    onUploadComplete: (url: string) => void;
}

export function CoverImageEditor({ onUploadComplete }: CoverImageEditorProps) {
    const [open, setOpen] = useState(false);
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const cropperRef = useRef<CropperRef>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { user } = useAuth();

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImage(reader.result as string);
                setOpen(true);
            });
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!cropperRef.current || !image) {
            return;
        }
        setLoading(true);
        const canvas = cropperRef.current.getCanvas();
        if (canvas) {
            const dataUrl = canvas.toDataURL();
            const imageRef = storageRef(storage, 'covers/cover-image.png');
            
            try {
                await uploadString(imageRef, dataUrl, 'data_url');
                const downloadURL = await getDownloadURL(imageRef);

                const themeRef = doc(db, 'settings', 'theme');
                await setDoc(themeRef, { coverImageUrl: downloadURL }, { merge: true });

                await logAudit({
                    action: 'upload_cover_image',
                    to: { coverImageUrl: downloadURL },
                    user,
                });

                toast({ title: "Cover Image Updated", description: "The new cover image has been saved." });
                setOpen(false);
                setImage(null);
                onUploadComplete(downloadURL);
            } catch (error) {
                console.error("Error uploading cover image: ", error);
                toast({ title: "Error", description: "Failed to upload cover image.", variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        }
    };

    const handleTriggerClick = () => {
        fileInputRef.current?.click();
    }
    
    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            setImage(null);
            setLoading(false);
        }
    }

    return (
        <>
            <Input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/gif"
            />
            <Button variant="outline" onClick={handleTriggerClick}>
                <Upload className="mr-2 h-4 w-4" />
                Upload
            </Button>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Update Cover Image</DialogTitle>
                        <DialogDescription>
                            Crop the image for the login page background.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="relative bg-muted rounded-md mx-auto" style={{ height: '300px', width: '300px' }}>
                       {image && (
                         <div className="relative h-full w-full">
                           <Cropper 
                              ref={cropperRef} 
                              src={image} 
                              className={'cropper'}
                           />
                         </div>
                       )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={loading}>Cancel</Button>
                        <Button onClick={handleUpload} disabled={loading || !image}>
                            {loading ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
