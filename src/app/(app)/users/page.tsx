
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash2 } from 'lucide-react';
import { collection, onSnapshot, query, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, Entity } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { AddUserDialog } from './_components/add-user-dialog';
import { EditUserDialog } from './_components/edit-user-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DeleteUserDialog } from './_components/delete-user-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Server actions for approve/reject
import { approveUser, rejectUser } from './_actions';

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [entities, setEntities] = useState<Entity[]>([]);
    const [loading, setLoading] = useState(true);
    const { user: currentUser, hasRole } = useAuth();
    const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
    const [selectedUserForDelete, setSelectedUserForDelete] = useState<User | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const fetchUsers = () => {
        if (!currentUser) return () => {};

        let usersQuery = query(collection(db, 'users'), where('status', '==', 'approved'));

        if (hasRole(['Admin']) && !hasRole(['Super User', 'Super Admin'])) {
            if (currentUser.entityId) {
                usersQuery = query(collection(db, 'users'), where('status', '==', 'approved'), where('entityId', '==', currentUser.entityId));
            } else {
                setUsers([]);
                return () => {};
            }
        }

        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
            setLoading(false);
        });

        return unsubUsers;
    };
    
    const fetchPendingUsers = () => {
        if (!currentUser) return () => {};

        let pendingQuery = query(collection(db, 'users'), where('status', '==', 'pending'));

        if (hasRole(['Admin']) && !hasRole(['Super User', 'Super Admin'])) {
            if (currentUser.entityId) {
                pendingQuery = query(collection(db, 'users'), where('status', '==', 'pending'), where('entityId', '==', currentUser.entityId));
            } else {
                setPendingUsers([]);
                return () => {};
            }
        }

        const unsubPending = onSnapshot(pendingQuery, (snapshot) => {
            setPendingUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
        });
        return unsubPending;
    };

    useEffect(() => {
        const fetchEntities = async () => {
            const entitiesSnapshot = await getDocs(collection(db, 'entities'));
            setEntities(entitiesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Entity)));
        };

        const unsubUsers = fetchUsers();
        const unsubPending = fetchPendingUsers();
        fetchEntities();

        return () => {
            unsubUsers();
            unsubPending();
        };
    }, [currentUser]);

    const handleEditUser = (user: User) => {
        setSelectedUserForEdit(user);
        setIsEditDialogOpen(true);
    };

    const handleDeleteUser = (user: User) => {
        setSelectedUserForDelete(user);
        setIsDeleteDialogOpen(true);
    };

    const getEntityName = (entityId?: string) => {
        if (!entityId) return 'Global';
        return entities.find(e => e.id === entityId)?.name || 'N/A';
    };

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
            <Tabs defaultValue="all">
                <div className="flex items-center justify-between mb-4">
                    <CardHeader className="p-0">
                        <CardTitle>User Management</CardTitle>
                        <CardDescription>View, add, and manage user accounts and roles.</CardDescription>
                    </CardHeader>
                    <div className="flex items-center gap-4">
                        <TabsList>
                            <TabsTrigger value="all">All Users</TabsTrigger>
                            <TabsTrigger value="pending">Pending Approval</TabsTrigger>
                        </TabsList>
                        <AddUserDialog onUserAdded={fetchUsers} entities={entities}/>
                    </div>
                </div>
                <TabsContent value="all">
                    <Card>
                        <CardContent className="pt-6">
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
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            <span>Edit</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            <span>Delete</span>
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
                </TabsContent>
                <TabsContent value="pending">
                    <Card>
                        <CardContent className="pt-6">
                            <Table className="w-full table-fixed">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[35%]">Name</TableHead>
                                        <TableHead className="w-[35%]">Email</TableHead>
                                        <TableHead className="w-[15%]">Entity</TableHead>
                                        <TableHead className="w-[15%] text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingUsers.map(user => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{renderCell(user.name)}</TableCell>
                                            <TableCell>{renderCell(user.email)}</TableCell>
                                            <TableCell>{renderCell(getEntityName(user.entityId))}</TableCell>
                                            <TableCell className="text-center">
                                                <Button size="sm" variant="outline" onClick={() => approveUser(user.id)} className="mr-2">Approve</Button>
                                                <Button size="sm" variant="destructive" onClick={() => rejectUser(user.id)}>Reject</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {pendingUsers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24">No users pending approval.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

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
