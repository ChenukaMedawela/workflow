
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Entity, User, UserRole } from "@/lib/types";
import React, { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logAudit } from "@/lib/audit-log";

const allUserRoles: UserRole[] = ['Super User', 'Super Admin', 'Admin', 'Manager', 'Viewer'];

const userSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  entityId: z.string().optional(),
  role: z.enum(allUserRoles),
});

interface EditUserDialogProps {
    user: User;
    entities: Entity[];
    onUserUpdated: () => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditUserDialog({ user, entities, onUserUpdated, open, onOpenChange }: EditUserDialogProps) {
  const { toast } = useToast();
  const { user: currentUser, hasRole } = useAuth();
  
  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
  });

  useEffect(() => {
    if (open && user) {
        form.reset({
            name: user.name,
            email: user.email,
            entityId: user.entityId || 'global',
            role: user.role
        })
    }
  }, [user, form, open]);

  const watchRole = form.watch("role");

  async function onSubmit(values: z.infer<typeof userSchema>) {
    try {
        const isSuperRole = values.role === 'Super Admin' || values.role === 'Super User';
        const entityShouldBeRemoved = isSuperRole || !values.entityId || values.entityId === 'global';

        const userRef = doc(db, 'users', user.id);

        const originalData = {
            name: user.name,
            role: user.role,
            entityId: user.entityId || null,
        };
        
        const updatedDataForFirestore: any = {
            name: values.name,
            role: values.role,
        };
        
        const updatedDataForLog: any = {
            name: values.name,
            role: values.role,
            entityId: null
        };

        if (hasRole(['Super User', 'Super Admin'])) {
            if (entityShouldBeRemoved) {
                updatedDataForFirestore.entityId = deleteField();
            } else {
                updatedDataForFirestore.entityId = values.entityId;
                updatedDataForLog.entityId = values.entityId;
            }
        } else {
            // If the user is an admin, they cannot change the entity.
            // The entityId from the form is not used, and the existing one is preserved.
            updatedDataForFirestore.entityId = user.entityId;
            updatedDataForLog.entityId = user.entityId;
        }

        await updateDoc(userRef, updatedDataForFirestore);

        const serializableUser = currentUser ? {
            id: currentUser.id,
            name: currentUser.name,
            entityId: currentUser.entityId,
            email: currentUser.email,
            role: currentUser.role,
        } : null;

        await logAudit({
            action: 'update_user',
            from: originalData,
            to: updatedDataForLog,
            details: { userId: user.id, userEmail: user.email },
            user: serializableUser,
        });

      toast({
        title: "User Updated",
        description: `${values.name}'s details have been updated.`,
      });
      onUserUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: "An error occurred while updating the user.",
        variant: "destructive",
      });
    }
  }

  const getAssignableRoles = () => {
    if (hasRole(['Super User'])) {
      return allUserRoles;
    } else if (hasRole(['Super Admin'])) {
      return allUserRoles.filter(role => role !== 'Super User');
    } else if (hasRole(['Admin'])) {
        return allUserRoles.filter(role => !['Super User', 'Super Admin'].includes(role));
    } else {
        return [];
    }
  };

  const isEntityHiddenForRole = !hasRole(['Super User', 'Super Admin']);
  const isEntityHiddenForSelectedRole = watchRole === 'Super Admin' || watchRole === 'Super User';
  const assignableRoles = getAssignableRoles();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update the details for {user.name}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john.doe@example.com" {...field} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value}>
                     <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {assignableRoles.map(role => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                    </SelectContent>
                   </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isEntityHiddenForRole && !isEntityHiddenForSelectedRole && (
                <FormField
                control={form.control}
                name="entityId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Entity</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        value={field.value}
                    >
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an entity" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="global">Global</SelectItem>
                        {entities.map((entity) => (
                            <SelectItem key={entity.id} value={entity.id}>
                            {entity.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}
            <DialogFooter>
              <Button type="submit" className="hover:bg-primary/90">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
