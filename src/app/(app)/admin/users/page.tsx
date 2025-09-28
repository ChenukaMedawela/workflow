
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash2 } from 'lucide-react';
import { collection, onSnapshot, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, Entity } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { AddUserDialog } from './_components/add-user-dialog';
import { EditUserDialog } from './_components/edit-user-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DeleteUserDialog } from './_components/delete-user-dialog';


export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [entities, setEntities] = useState<Entity[]>([]);
    const [loading, setLoading] = useState(true);
    const { user: currentUser, hasRole } = useAuth();
    const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
    const [selectedUserForDelete, setSelectedUserForDelete] = useState<User | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const fetchUsers = () => {
         const unsubUsers = onSnapshot(query(collection(db, 'users')), (snapshot) => {
            let usersList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
            setUsers(usersList);
            setLoading(false);
        });
        return unsubUsers;
    }

    useEffect(() => {
        const fetchEntities = async () => {
            const entitiesSnapshot = await getDocs(collection(db, 'entities'));
            setEntities(entitiesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Entity)));
        };

        const unsub = fetchUsers();
        fetchEntities();

        return () => unsub();
    }, []);

    const handleEditUser = (user: User) => {
        setSelectedUserForEdit(user);
        setIsEditDialogOpen(true);
    };

    const handleDeleteUser = (user: User) => {
        setSelectedUserForDelete(user);
        setIsDeleteDialogOpen(true);
    }

    const getEntityName = (entityId?: string) => {
        if (!entityId) return 'Global';
        return entities.find(e => e.id === entityId)?.name || 'N/A';
    }

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
            </div>
        );
    }
    
    const renderCell = (value: string | undefined) => (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <p className="truncate">{value || 'N/A'}</p>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{value || 'N/A'}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>User Management</CardTitle>
                            <CardDescription>View, add, and manage user accounts and roles.</CardDescription>
                        </div>
                        <AddUserDialog onUserAdded={fetchUsers} entities={entities}/>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table className="w-full table-fixed">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[30%]">Name</TableHead>
                                <TableHead className="w-[30%]">Email</TableHead>
                                <TableHead className="w-[15%]">Role</TableHead>
                                <TableHead className="w-[15%]">Entity</TableHead>
                                <TableHead className="w-[10%] text-center">
                                    <span className="sr-only">Actions</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{renderCell(user.name)}</TableCell>
                                    <TableCell>{renderCell(user.email)}</TableCell>
                                    <TableCell>{renderCell(user.role)}</TableCell>
                                    <TableCell>{renderCell(getEntityName(user.entityId))}</TableCell>
                                    <TableCell className="text-center">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="h-4 w-4" />
                                                    <span className="sr-only">Actions for {user.name}</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEditUser(user)} className="hover:bg-accent/20 focus:bg-accent/20">
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    <span>Edit User</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem 
                                                    onClick={() => handleDeleteUser(user)} 
                                                    className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>Delete User</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">No users found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {selectedUserForEdit && (
                <EditUserDialog
                    user={selectedUserForEdit}
                    entities={entities}
                    onUserUpdated={() => {
                        fetchUsers();
                        setSelectedUserForEdit(null);
                    }}
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                />
            )}
            
            <DeleteUserDialog
                userToDelete={selectedUserForDelete}
                onUserDeleted={() => {
                    fetchUsers();
                    setSelectedUserForDelete(null);
                }}
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
            />
        </>
    );
}
