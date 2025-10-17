'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { updateUser } from '../_actions';
import { useAuth } from '@/hooks/use-auth';
import { Entity } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(1, 'Display name is required'),
  email: z.string().email('Invalid email address'),
  role: z.string().optional(),
  entity: z.string().optional(),
});

type FormSchema = z.infer<typeof formSchema>;

export function EditUserDialog({
  user,
  entities,
  isOpen,
  onClose,
}: {
  user: User;
  entities: Entity[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const { user: currentUser, hasRole } = useAuth();

  const availableRoles = () => {
      if (hasRole(['Super Admin'])) {
          return ['Super Admin', 'Super User', 'Admin', 'Editor', 'Viewer'];
      }
      if (hasRole(['Super User'])) {
          return ['Admin', 'Editor', 'Viewer'];
      }
      if (hasRole(['Admin'])) {
          return ['Editor', 'Viewer'];
      }
      return [];
  };

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      role: user.role,
      entity: user.entityId,
    },
  });

  const onSubmit = async (data: FormSchema) => {
    try {
      await updateUser(user.uid, data);
      toast({
        title: 'User updated',
        description: `The user ${data.name} has been updated.`,
      });
      router.refresh();
      onClose();
    } catch (error) {
      toast({
        title: 'Error updating user',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit User</AlertDialogTitle>
          <AlertDialogDescription>
            Update the details for the user {user.name}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
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
                    <Input placeholder="john.doe@example.com" {...field} />
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
                                {availableRoles().map(role => (
                                    <SelectItem key={role} value={role}>{role}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            {(hasRole(['Admin', 'Super User', 'Super Admin'])) && (
              <FormField
                control={form.control}
                name="entity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!hasRole(['Super User', 'Super Admin'])}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an entity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Global</SelectItem>
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
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction type="submit">Save</AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
