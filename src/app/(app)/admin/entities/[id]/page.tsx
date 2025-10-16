
"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, doc, onSnapshot, query, where, writeBatch, deleteDoc } from 'firebase/firestore';
import { User, Lead, Entity, Stage } from '@/lib/types';
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { logAudit } from "@/lib/audit-log";
import { useRouter } from 'next/navigation';


export default function EntityManagementPage({ params }: { params: { id: string } }) {
    const { user, hasRole } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const entityId = params.id;

    const [entity, setEntity] = useState<Entity | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [stages, setStages] = useState<Stage[]>([]);
    const [allEntities, setAllEntities] = useState<Entity[]>([]);
    
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !entityId) return;

        const canView = hasRole(['Admin', 'Super Admin']);
        if (!canView) {
            setLoading(false);
            return;
        }

        const entityDocRef = doc(db, 'entities', entityId);
        const unsubEntity = onSnapshot(entityDocRef, (doc) => {
            if (doc.exists()) {
                setEntity({ ...doc.data(), id: doc.id } as Entity);
            }
        });

        const entitiesQuery = query(collection(db, 'entities'), where('__name__', '!=', entityId));
        const unsubAllEntities = onSnapshot(entitiesQuery, (snapshot) => {
            const entitiesList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Entity));
            const filteredEntities = entitiesList.filter(e => e.name !== 'Default Entity');
            setAllEntities(filteredEntities);
        });

        const usersQuery = query(collection(db, 'users'), where('entityId', '==', entityId));
        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
            setLoading(false);
        });
        
        const leadsQuery = query(collection(db, 'leads'), where('ownerEntityId', '==', entityId));
        const unsubLeads = onSnapshot(leadsQuery, (snapshot) => {
            setLeads(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Lead)));
        });

        const stagesQuery = query(collection(db, 'stages'));
        const unsubStages = onSnapshot(stagesQuery, (snapshot) => {
            setStages(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Stage)));
        });

        return () => {
            unsubEntity();
            unsubAllEntities();
            unsubUsers();
            unsubLeads();
            unsubStages();
        };
    }, [user, entityId, hasRole]);

    const handleSelectAllUsers = (checked: boolean) => {
        setSelectedUsers(checked ? users.map(u => u.id) : []);
    };
    
    const handleSelectAllLeads = (checked: boolean) => {
        setSelectedLeads(checked ? leads.map(l => l.id) : []);
    };

    const handleUnassignUsers = async () => {
        if (selectedUsers.length === 0) {
            toast({ title: "No users selected", description: "Please select users to un-assign.", variant: "destructive" });
            return;
        }

        try {
            const batch = writeBatch(db);
            selectedUsers.forEach(userId => {
                const userDocRef = doc(db, 'users', userId);
                batch.update(userDocRef, { entityId: null });
            });
            await batch.commit();

            await logAudit({
                action: 'bulk_unassign_users',
                from: { id: entityId, name: entity?.name },
                details: { userCount: selectedUsers.length, users: selectedUsers },
                user
            });

            toast({ title: "Success", description: `${selectedUsers.length} users have been moved to the global pool.` });
            setSelectedUsers([]);
        } catch (error) {
            console.error("Error un-assigning users:", error);
            toast({ title: "Error", description: "Failed to un-assign users.", variant: "destructive" });
        }
    };
    
    const handleReassignLeads = async (targetEntityId: string | null, targetEntityName: string) => {
        if (selectedLeads.length === 0) {
            toast({ title: "No leads selected", description: "Please select leads to re-assign.", variant: "destructive" });
            return;
        }

        try {
            const batch = writeBatch(db);
            selectedLeads.forEach(leadId => {
                const leadDocRef = doc(db, 'leads', leadId);
                batch.update(leadDocRef, { ownerEntityId: targetEntityId });
            });
            await batch.commit();
            
            await logAudit({
                action: 'bulk_reassign_leads',
                from: { id: entityId, name: entity?.name },
                to: { id: targetEntityId, name: targetEntityName },
                details: { leadCount: selectedLeads.length, leads: selectedLeads },
                user
            });

            toast({ title: "Success", description: `${selectedLeads.length} leads have been re-assigned to ${targetEntityName}.` });
            setSelectedLeads([]);
        } catch (error) {
            console.error("Error re-assigning leads:", error);
            toast({ title: "Error", description: "Failed to re-assign leads.", variant: "destructive" });
        }
    };

    const handleDeleteEntity = async () => {
        if (!entity) return;

        try {
            const entityDocRef = doc(db, 'entities', entity.id);
            await deleteDoc(entityDocRef);

            await logAudit({
                action: 'delete_entity',
                from: { id: entityId, name: entity?.name },
                details: { entityName: entity.name },
                user
            });

            toast({ title: "Success", description: `Entity "${entity.name}" has been deleted.` });
            router.push('/admin/entities');
        } catch (error) {
            console.error("Error deleting entity:", error);
            toast({ title: "Error", description: "Failed to delete entity.", variant: "destructive" });
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
            </div>
        );
    }
    
    if (!hasRole(['Admin', 'Super Admin'])) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <PageHeader
                    title="Access Denied"
                    description="You do not have permission to view this page."
                />
            </div>
        )
    }

    const getStageName = (stageId: string) => {
        const stage = stages.find(s => s.id === stageId);
        return stage ? stage.name : 'N/A';
    };

    const canDelete = users.length === 0 && leads.length === 0;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-6">
                <Breadcrumbs
                    parent="Admin"
                    parentHref="/admin/entities"
                    current={`Manage ${entity?.name || 'Entity'}`}
                />
                <PageHeader 
                    title={`Manage ${entity?.name || 'Entity'}`}
                    description="Manage users and leads for this entity."
                />
                
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Manage Users</CardTitle>
                                <CardDescription>Un-assign users from this entity, making them available in the global pool.</CardDescription>
                            </div>
                            <Button onClick={handleUnassignUsers} disabled={selectedUsers.length === 0}>Un-assign Selected Users</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={selectedUsers.length > 0 && selectedUsers.length === users.length}
                                            onCheckedChange={handleSelectAllUsers}
                                        />
                                    </TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map(u => (
                                    <TableRow key={u.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedUsers.includes(u.id)}
                                                onCheckedChange={(checked) => {
                                                    setSelectedUsers(prev => checked ? [...prev, u.id] : prev.filter(id => id !== u.id));
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>{u.name}</TableCell>
                                        <TableCell>{u.email}</TableCell>
                                    </TableRow>
                                ))}
                                {users.length === 0 && <TableRow><TableCell colSpan={3} className="text-center h-24">No users in this entity.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Manage Leads</CardTitle>
                                <CardDescription>Re-assign leads to a different entity or move them to the global stage.</CardDescription>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button disabled={selectedLeads.length === 0}>Re-assign Selected Leads</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onSelect={() => handleReassignLeads(null, 'Global Stage')}>
                                        Move to Global Stage
                                    </DropdownMenuItem>
                                    {allEntities.map(e => (
                                        <DropdownMenuItem key={e.id} onSelect={() => handleReassignLeads(e.id, e.name)}>
                                            Assign to {e.name}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={selectedLeads.length > 0 && selectedLeads.length === leads.length}
                                            onCheckedChange={handleSelectAllLeads}
                                        />
                                    </TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leads.map(l => (
                                    <TableRow key={l.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedLeads.includes(l.id)}
                                                onCheckedChange={(checked) => {
                                                    setSelectedLeads(prev => checked ? [...prev, l.id] : prev.filter(id => id !== l.id));
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>{l.accountName}</TableCell>
                                        <TableCell>{getStageName(l.stageId)}</TableCell>
                                    </TableRow>
                                ))}
                                 {leads.length === 0 && <TableRow><TableCell colSpan={3} className="text-center h-24">No leads in this entity.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle>Delete Entity</CardTitle>
                        <CardDescription>Permanently delete this entity. This action cannot be undone.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>Before deleting, please ensure that all users and leads have been re-assigned to other entities. An entity cannot be deleted if it still has users or leads assigned to it.</p>
                    </CardContent>
                    <CardFooter>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={!canDelete}>Delete Entity</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the entity and all of its associated data. 
                                    Please ensure you have re-assigned all users and leads before proceeding.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteEntity}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
