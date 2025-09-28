
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Entity, UserRole } from "@/lib/types";
import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logAudit } from "@/lib/audit-log";
import { cn } from "@/lib/utils";

const allUserRoles: UserRole[] = ['Super User', 'Super Admin', 'Admin', 'Manager', 'Viewer'];

const userSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  entityId: z.string().optional(),
  role: z.enum(allUserRoles),
});

interface AddUserDialogProps {
    onUserAdded?: () => void;
    entities: Entity[];
}

export function AddUserDialog({ onUserAdded, entities }: AddUserDialogProps) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const { signup, user } = useAuth();
  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      entityId: "",
      role: "Viewer",
    },
  });

  const watchRole = form.watch("role");

  async function onSubmit(values: z.infer<typeof userSchema>) {
    try {
      const isSuperRole = values.role === 'Super Admin' || values.role === 'Super User';
      const entityId = isSuperRole ? undefined : (values.entityId === 'global' || !values.entityId ? undefined : values.entityId);

      const newUser = await signup(values.email, values.password, values.name, entityId, values.role);
      
      const entityName = entities.find(e => e.id === entityId)?.name || 'Global';

      await logAudit({
          action: 'create_user',
          to: {
            id: newUser.id,
            name: values.name,
            email: values.email,
            role: values.role,
            entity: entityName,
          },
          details: { name: values.name, email: values.email, role: values.role }
      });

      toast({
        title: "User Created",
        description: `${values.name} has been added with the role ${values.role}.`,
      });
      onUserAdded?.();
      setOpen(false);
      form.reset();
    } catch (error: any) {
      console.error("Error creating user:", error);
      let description = "An error occurred while creating the user.";
      if (error.code === 'auth/email-already-in-use') {
        description = "This email address is already in use by another account.";
      }
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    }
  }

  const getAssignableRoles = () => {
    if (user?.role === 'Super User') {
      return allUserRoles;
    } else if (user?.role === 'Super Admin') {
      return allUserRoles.filter(role => role !== 'Super User');
    } else if (user?.role === 'Admin') {
        return allUserRoles.filter(role => role !== 'Super User' && role !== 'Super Admin');
    } else {
        return [];
    }
  };

  const isEntityHidden = watchRole === 'Super Admin' || watchRole === 'Super User';
  const assignableRoles = getAssignableRoles();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Enter the details for the new user below.
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
                    <Input type="email" placeholder="john.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
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
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            {!isEntityHidden && (
                <FormField
                control={form.control}
                name="entityId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Entity</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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
              <Button type="submit" className="hover:bg-primary/90">Create User</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
