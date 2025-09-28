
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Cropper, CropperRef } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from "firebase/storage";
import { doc, setDoc } from 'firebase/firestore';
import { db, app } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Upload } from 'lucide-react';
import { logAudit } from '@/lib/audit-log';

const storage = getStorage(app);

export function LogoEditor() {
    const [open, setOpen] = useState(false);
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const cropperRef = useRef<CropperRef>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImage(reader.result as string);
            });
            reader.readAsDataURL(e.target.files[0]);
        }
        // Reset file input to allow re-uploading the same file
        if(e.target) e.target.value = "";
    };

    const handleUpload = async () => {
        if (!cropperRef.current || !image) {
            return;
        }
        setLoading(true);
        const canvas = cropperRef.current.getCanvas();
        if (canvas) {
            const dataUrl = canvas.toDataURL();
            const imageRef = storageRef(storage, 'logos/logo.png');
            
            try {
                await uploadString(imageRef, dataUrl, 'data_url');
                const downloadURL = await getDownloadURL(imageRef);

                const themeRef = doc(db, 'settings', 'theme');
                await setDoc(themeRef, { logoUrl: downloadURL }, { merge: true });

                await logAudit({
                    action: 'upload_logo',
                    to: { logoUrl: downloadURL },
                });

                toast({ title: "Logo Updated", description: "The new logo has been saved." });
                setOpen(false);
                setImage(null);
            } catch (error) {
                console.error("Error uploading logo: ", error);
                toast({ title: "Error", description: "Failed to upload logo.", variant: 'destructive' });
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
            // Reset state when dialog closes
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
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Logo
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Update Logo</DialogTitle>
                        <DialogDescription>
                            Upload and crop the image to a square. This will be your new application logo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="relative h-80 w-full bg-muted rounded-md flex items-center justify-center">
                       {image ? (
                         <div className="relative h-full w-full">
                           <Cropper 
                              ref={cropperRef} 
                              src={image} 
                              className={'cropper'} 
                              stencilProps={{aspectRatio: 1}}
                           />
                         </div>
                       ) : (
                        <div className="flex flex-col items-center gap-4">
                            <p className="text-sm text-muted-foreground">No image selected</p>
                            <Button variant="outline" onClick={handleTriggerClick}>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Picture
                            </Button>
                        </div>
                       )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={loading}>Cancel</Button>
                        <Button onClick={handleUpload} disabled={loading || !image}>
                            {loading ? 'Saving...' : 'Save Logo'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
