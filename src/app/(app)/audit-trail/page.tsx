
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AuditLog, User } from '@/lib/types';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, GitCommitHorizontal } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { JsonViewer } from '@textea/json-viewer';


function AuditLogItem({ log, allUsers }: { log: AuditLog, allUsers: User[] }) {
    const actorName = log.user.id === 'system' ? 'System' : allUsers.find(u => u.id === log.user.id)?.name || log.user.name;

    const renderChange = (value: any) => {
        if (typeof value === 'object' && value !== null) {
            return (
                 <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="link" className="p-0 h-auto">View Details</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Change Details</DialogTitle>
                             <DialogDescription>
                                Detailed view of the changes made.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[60vh] overflow-y-auto rounded-md bg-muted/50 p-4">
                            <JsonViewer 
                                value={value}
                                theme="dark"
                                displayDataTypes={false}
                                style={{ background: 'transparent' }}
                             />
                        </div>
                    </DialogContent>
                </Dialog>
            );
        }
        return <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{String(value)}</span>;
    };

    const getActionDescription = () => {
        const details = log.details || {};
        switch (log.action) {
            case 'create_user':
                return `created user ${details.name || ''}`;
            case 'delete_user':
                return `deleted user ${details.deletedUserName || ''}`;
            case 'update_user':
                return `updated user ${details.userEmail || ''}`;
            case 'login':
                return `logged in`;
            case 'logout':
                return `logged out`;
            case 'create_lead':
                return `created lead '${details.leadName || ''}'`;
            case 'update_lead':
                 return `updated lead '${details.leadName || ''}'`;
            case 'move_lead':
                return `moved lead '${details.leadName || ''}'`;
            case 'create_pipeline_stage':
                return `created pipeline stage '${details.stageName || ''}'`;
            case 'rename_pipeline_stage':
                return `renamed pipeline stage`;
            case 'delete_pipeline_stage':
                return `deleted pipeline stage '${details.stageName || ''}'`;
            case 'update_stage_property':
                return `updated properties for stage '${details.stageName || ''}'`;
             case 'reorder_pipeline_stages':
                return `reordered pipeline stages`;
            case 'generate_ai_recommendations':
                return `generated AI automation recommendations`;
            case 'save_automation_rule':
                return `saved automation rule for stage '${details.stageName || ''}'`;
             case 'upload_logo':
                return `uploaded a new application logo`;
            case 'remove_logo':
                return `removed the application logo`;
             case 'create_entity':
                return `created a new entity '${details.entityName || ''}'`;
            case 'signup':
                return `signed up a new account`;
            default:
                return log.action.replace(/_/g, ' ');
        }
    };
    
    const actor = allUsers.find(u => u.id === log.user.id);

    return (
        <div className="relative flex items-start gap-4">
            <div className="absolute left-6 top-1 h-full w-0.5 bg-border -translate-x-1/2" />
            <div className="relative z-10">
                <Avatar className="h-12 w-12 border-4 border-background">
                    {log.user.id === 'system' ? (
                         <AvatarFallback><Bot className="h-6 w-6" /></AvatarFallback>
                    ) : (
                        <>
                            <AvatarImage src={actor?.avatarUrl} alt={actorName} />
                            <AvatarFallback>{getInitials(actorName)}</AvatarFallback>
                        </>
                    )}
                </Avatar>
            </div>
            <div className="pt-2 flex-1">
                <p className="text-sm">
                    <span className="font-semibold">{actorName}</span> {getActionDescription()}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm:ss a")}
                </p>
                {log.from && log.to && (
                     <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                        <GitCommitHorizontal className="h-4 w-4" />
                        <div className="flex items-center gap-2 flex-wrap">
                            {Object.entries(log.from).map(([key, value]) => (
                                <div key={key} className="flex items-center gap-1">
                                    <span className="capitalize text-xs">{key.replace(/([A-Z])/g, ' $1')}:</span>
                                    {renderChange(value)}
                                    <span>→</span>
                                    {renderChange(log.to[key])}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


export default function AuditTrailPage() {
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [userFilter, setUserFilter] = useState('all');
    const [actionFilter, setActionFilter] = useState('all');
    
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 20;

    useEffect(() => {
        const fetchAllUsers = async () => {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const usersList = usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as User);
            setAllUsers(usersList);
        };
        fetchAllUsers();

        const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
            setAuditLogs(logs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching audit logs: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const uniqueActions = useMemo(() => {
        return [...new Set(auditLogs.map(log => log.action))];
    }, [auditLogs]);

    const filteredLogs = useMemo(() => {
        return auditLogs.filter(log => {
            const userMatch = userFilter === 'all' || log.user.id === userFilter;
            const actionMatch = actionFilter === 'all' || log.action === actionFilter;
            return userMatch && actionMatch;
        });
    }, [auditLogs, userFilter, actionFilter]);
    
    const paginatedLogs = filteredLogs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const totalPages = Math.ceil(filteredLogs.length / rowsPerPage);

    const groupedLogs = useMemo(() => {
        return paginatedLogs.reduce((acc, log) => {
            const date = new Date(log.timestamp);
            let dayLabel;
            if (isToday(date)) {
                dayLabel = 'Today';
            } else if (isYesterday(date)) {
                dayLabel = 'Yesterday';
            } else {
                dayLabel = format(date, 'MMMM d, yyyy');
            }
            if (!acc[dayLabel]) {
                acc[dayLabel] = [];
            }
            acc[dayLabel].push(log);
            return acc;
        }, {} as Record<string, AuditLog[]>);
    }, [paginatedLogs]);


    return (
        <div>
            <PageHeader
                title="Audit Trail"
                description="View a log of all activities within the system."
            />
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-64">
                            <Select value={userFilter} onValueChange={setUserFilter}>
                                <SelectTrigger id="user-filter">
                                    <SelectValue placeholder="Filter by user..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Users</SelectItem>
                                    <SelectItem value="system">System</SelectItem>
                                    {allUsers.map(user => (
                                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-64">
                             <Select value={actionFilter} onValueChange={setActionFilter}>
                                <SelectTrigger id="action-filter">
                                    <SelectValue placeholder="Filter by action..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Actions</SelectItem>
                                    {uniqueActions.map(action => (
                                        <SelectItem key={action} value={action}>
                                            {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {loading ? (
                         <div className="flex items-center justify-center h-64">
                            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            No audit logs found for the selected filters.
                        </div>
                    ) : (
                         <div className="space-y-8">
                            {Object.entries(groupedLogs).map(([day, logs]) => (
                                <div key={day}>
                                    <h3 className="text-lg font-semibold mb-4 sticky top-0 bg-background/80 backdrop-blur-sm py-2 z-20">{day}</h3>
                                    <div className="space-y-6">
                                        {logs.map(log => (
                                            <AuditLogItem key={log.id} log={log} allUsers={allUsers}/>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {!loading && filteredLogs.length > rowsPerPage && (
                        <div className="flex items-center justify-between mt-6">
                            <div className="text-sm text-muted-foreground">
                                Showing {Math.min((currentPage - 1) * rowsPerPage + 1, filteredLogs.length)} to {Math.min(currentPage * rowsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
