

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, PlusCircle } from "lucide-react";
import Link from "next/link";
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, query } from 'firebase/firestore';
import { User, Entity } from '@/lib/types';
import { useAuth } from "@/hooks/use-auth";
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit-log";


export default function AdminEntitiesPage() {
    const { user, hasRole } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [entities, setEntities] = useState<Entity[]>([]);
    const [loading, setLoading] = useState(true);
    const [newEntityName, setNewEntityName] = useState("");
    const { toast } = useToast();
    
    useEffect(() => {
        if (!user) return;

        const isSuper = hasRole(['Super User', 'Super Admin']);

        const entitiesQuery = query(collection(db, 'entities'));
        
        const unsubEntities = onSnapshot(entitiesQuery, (snapshot) => {
            let entitiesList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Entity));
            if (!isSuper) {
                // For non-super users, filter to only their entity
                entitiesList = entitiesList.filter(e => e.id === user.entityId);
            }
            setEntities(entitiesList);
            setLoading(false);
        });

        const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            const usersList = snapshot.docs.map(doc => doc.data() as User);
            setUsers(usersList);
        });

        return () => {
            unsubEntities();
            unsubUsers();
        };

    }, [user, hasRole]);

    const handleAddEntity = async () => {
        if (!newEntityName.trim()) {
            toast({ title: "Error", description: "Entity name cannot be empty.", variant: "destructive" });
            return;
        }

        try {
            const newEntity = { name: newEntityName };
            const docRef = await addDoc(collection(db, "entities"), newEntity);
            
            await logAudit({
                action: 'create_entity',
                to: { id: docRef.id, ...newEntity },
                details: { entityName: newEntityName }
            });
            
            toast({ title: "Success", description: `Entity "${newEntityName}" has been added.` });
            setNewEntityName('');
        } catch (error) {
            console.error("Error adding entity:", error);
            toast({ title: "Error", description: "Failed to add entity.", variant: "destructive" });
        }
    }
    
    const showAddEntity = hasRole(['Super User', 'Super Admin']);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
            </div>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                 <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Entity Management</CardTitle>
                        <CardDescription>Manage the organizational units or departments.</CardDescription>
                    </div>
                    {showAddEntity && (
                        <div className="flex items-center gap-2">
                           <Input 
                                placeholder="Enter new entity name" 
                                value={newEntityName}
                                onChange={(e) => setNewEntityName(e.target.value)}
                                className="w-64"
                            />
                            <Button onClick={handleAddEntity}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Entity
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Entity Name</TableHead>
                            <TableHead>User Count</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {entities.map(entity => {
                            const userCount = users.filter(u => u.entityId === entity.id).length;
                            return (
                                <TableRow key={entity.id}>
                                    <TableCell className="font-medium">{entity.name}</TableCell>
                                    <TableCell>{userCount}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/admin/entities/${entity.id}`}>
                                                Manage <ArrowRight className="ml-2 h-4 w-4"/>
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                         {entities.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24">No entities found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
