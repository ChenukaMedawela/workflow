

'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AuditLog, Entity, Stage, User } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isToday, isYesterday } from '@/lib/utils';
import { 
    FilePlus2, 
    FilePenLine, 
    FileX2, 
    ArrowRightLeft, 
    UserPlus, 
    UserCog, 
    UserX, 
    LogIn, 
    LogOut,
    Building,
    ChevronsRightLeft,
    Lightbulb,
    Palette,
    UploadCloud,
    Trash2,
    PenSquare,
    PlusCircle,
    Replace,
    Wrench,
    Save
} from 'lucide-react';

const formatFieldName = (fieldName: string) => {
    const words = fieldName.replace(/([A-Z])/g, ' $1');
    return words.charAt(0).toUpperCase() + words.slice(1);
};

const actionIcons: Record<string, JSX.Element> = {
    'create_lead': <FilePlus2 className="h-5 w-5" />,
    'update_lead': <FilePenLine className="h-5 w-5" />,
    'delete_lead': <FileX2 className="h-5 w-5" />,
    'move_lead': <ArrowRightLeft className="h-5 w-5" />,
    
    'create_user': <UserPlus className="h-5 w-5" />,
    'update_user': <UserCog className="h-5 w-5" />,
    'delete_user': <UserX className="h-5 w-5" />,
    
    'login': <LogIn className="h-5 w-5" />,
    'logout': <LogOut className="h-5 w-5" />,
    
    'create_entity': <Building className="h-5 w-5" />,
    
    'create_pipeline_stage': <PlusCircle className="h-5 w-5" />,
    'delete_pipeline_stage': <Trash2 className="h-5 w-5" />,
    'rename_pipeline_stage': <PenSquare className="h-5 w-5" />,
    'reorder_pipeline_stages': <Replace className="h-5 w-5" />,
    'update_stage_property': <Wrench className="h-5 w-5" />,
    
    'save_automation_rule': <Save className="h-5 w-5" />,
    'generate_ai_recommendations': <Lightbulb className="h-5 w-5" />,
    
    'upload_logo': <UploadCloud className="h-5 w-5" />,
    'remove_logo': <Trash2 className="h-5 w-5" />,
};

const AuditLogItem = ({ log, stagesMap, entitiesMap }: { log: AuditLog, stagesMap: Record<string, string>, entitiesMap: Record<string, string> }) => {
    const { user, action, from, to, details, timestamp } = log;

    const renderValue = (key: string, value: any) => {
        if (value === null || value === undefined) return <span className="italic text-muted-foreground">not set</span>;
        if (key === 'stageId') return <span className="font-medium">{stagesMap[value] || value}</span>;
        if (key === 'entityId' || key === 'ownerEntityId') return <span className="font-medium">{entitiesMap[value] || value}</span>;
        return <span className="font-medium">{String(value)}</span>;
    };
    
    const getActionText = () => {
        const actionText = action.replace(/_/g, ' ');
        let subject = '';

        if (details?.leadName) subject = `the lead '${details.leadName}'`;
        else if (details?.entityName) subject = `the entity '${details.entityName}'`;
        else if (details?.stageName) subject = `the stage '${details.stageName}'`;
        else if (details?.userName) subject = `the user '${details.userName}'`;
        else if (action.includes('user')) subject = 'a user';
        else if (action.includes('stage')) subject = 'a stage';
        else if (action.includes('entity')) subject = 'an entity';
        else if (action.includes('lead')) subject = 'a lead';
        else if (action.includes('logo')) subject = 'the logo';
        else if (action.includes('recommendations')) subject = 'AI recommendations';
        
        return `${actionText} ${subject}`;
    }

    const changes = to ? Object.keys(to)
        .map(key => {
            const fromValue = from?.[key];
            const toValue = to?.[key];
            if (JSON.stringify(fromValue) === JSON.stringify(toValue)) {
                return null;
            }
            return {
                key,
                from: renderValue(key, fromValue),
                to: renderValue(key, toValue),
            };
        })
        .filter(Boolean)
        : [];
    
    const entityName = user.entityId ? entitiesMap[user.entityId] : 'Global';

    return (
        <div className="flex gap-x-3">
            <div className="relative last:after:hidden after:absolute after:top-7 after:bottom-0 after:start-3.5 after:w-px after:-translate-x-1/2 after:bg-border">
                <div className="relative z-10 w-7 h-7 flex justify-center items-center bg-background rounded-full ring-4 ring-background text-muted-foreground">
                    {actionIcons[action] || <PenSquare className="h-5 w-5" />}
                </div>
            </div>

            <div className="grow pt-0.5 pb-8">
                <div className="flex gap-x-2">
                    <p className="text-sm text-foreground">
                        <span className="font-semibold">{user?.name || 'System'}</span>
                        {' '}
                        {getActionText()}
                    </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                        {format(new Date(log.timestamp), 'MMMM d, yyyy, h:mm:ss a')}
                    </p>
                    {entityName && (
                        <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Building className="h-3 w-3" />
                                <span>{entityName}</span>
                            </div>
                        </>
                    )}
                </div>

                {changes.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {changes.map(change => (
                            <div key={change.key} className="text-sm">
                                <span className="font-medium text-foreground">{formatFieldName(change.key)} changed:</span>
                                <div className="ml-4 mt-1 flex items-center text-sm">
                                    <span className="bg-muted px-2 py-0.5 rounded-md">{change.from}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mx-2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                    <span className="bg-muted px-2 py-0.5 rounded-md">{change.to}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const DateSection = ({ date, children }: { date: string, children: React.ReactNode }) => (
    <div>
        <div className="sticky top-0 z-20 -ml-8 mb-4">
            <h3 className="text-sm font-semibold bg-background/80 backdrop-blur-sm inline-block px-2 py-1 rounded-md">{date}</h3>
        </div>
        <div className="space-y-2">
            {children}
        </div>
    </div>
);


export default function AuditTrailPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [stagesMap, setStagesMap] = useState<Record<string, string>>({});
    const [entitiesMap, setEntitiesMap] = useState<Record<string, string>>({});
    const [users, setUsers] = useState<User[]>([]);

    // Filters
    const [actionFilter, setActionFilter] = useState<string>('all');
    const [entityFilter, setEntityFilter] = useState<string>('all');
    const [userFilter, setUserFilter] = useState<string>('all');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const stagesPromise = getDocs(collection(db, 'pipelineStages'));
                const entitiesPromise = getDocs(collection(db, 'entities'));
                const usersPromise = getDocs(collection(db, 'users'));
                
                const [stages, entities, users] = await Promise.all([
                    stagesPromise,
                    entitiesPromise,
                    usersPromise,
                ]);

                const stagesData = stages.docs.reduce((acc, doc) => {
                    const stage = doc.data() as Stage;
                    acc[doc.id] = stage.name;
                    return acc;
                }, {} as Record<string, string>);
                setStagesMap(stagesData);

                const entitiesData = entities.docs.reduce((acc, doc) => {
                    const entity = doc.data() as Entity;
                    acc[doc.id] = entity.name;
                    return acc;
                }, {} as Record<string, string>);
                setEntitiesMap(entitiesData);

                const usersData = users.docs.map(doc => ({ ...doc.data(), id: doc.id }) as User);
                setUsers(usersData);
                
                const logsQuery = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
                const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
                    const logsData = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            timestamp: data.timestamp.toDate ? data.timestamp.toDate().toISOString() : data.timestamp,
                        } as AuditLog;
                    });
                    setLogs(logsData);
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching audit logs in real-time:", error);
                    setLoading(false);
                });

                return unsubscribe;

            } catch (error) {
                console.error('Error fetching initial data:', error);
                setLoading(false);
            }
        };

        const unsubscribePromise = fetchData();

        return () => {
            unsubscribePromise.then(unsub => unsub && unsub());
        };
    }, []);


    useEffect(() => {
        let updatedLogs = logs;

        if (actionFilter !== 'all') {
            updatedLogs = updatedLogs.filter(log => log.action === actionFilter);
        }

        if (entityFilter !== 'all') {
            updatedLogs = updatedLogs.filter(log => log.user.entityId === entityFilter);
        }

        if (userFilter !== 'all') {
            updatedLogs = updatedLogs.filter(log => log.user.id === userFilter);
        }

        setFilteredLogs(updatedLogs);
    }, [actionFilter, entityFilter, userFilter, logs]);

    const actionTypes = [...new Set(logs.map(log => log.action))].sort();

    const groupedLogs = filteredLogs.reduce((acc, log) => {
        const logDate = new Date(log.timestamp);
        let dateKey: string;
        if (isToday(logDate)) {
            dateKey = 'Today';
        } else if (isYesterday(logDate)) {
            dateKey = 'Yesterday';
        } else {
            dateKey = format(logDate, 'MMMM d, yyyy');
        }
        
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(log);
        return acc;
    }, {} as Record<string, AuditLog[]>);

    return (
        <>
            <PageHeader
                title="Audit Trail"
                description="A chronological log of all lead-related activities."
            />

            <Card>
                <CardHeader>
                    <CardTitle>Recent Activities</CardTitle>
                    <CardDescription>Browse the timeline of changes and updates.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        {/* Action Type Filter */}
                        <Select onValueChange={setActionFilter} value={actionFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Filter by action..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Actions</SelectItem>
                                {actionTypes.map(action => (
                                    <SelectItem key={action} value={action}>{action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Entity Filter */}
                        <Select onValueChange={setEntityFilter} value={entityFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Filter by entity..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Entities</SelectItem>
                                {Object.entries(entitiesMap).map(([id, name]) => (
                                    <SelectItem key={id} value={id}>{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* User Filter */}
                        <Select onValueChange={setUserFilter} value={userFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Filter by user..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                {users.map(user => (
                                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
                        </div>
                    ) : filteredLogs.length > 0 ? (
                        <div className="relative pl-8">
                            {Object.entries(groupedLogs).map(([date, logsForDate]) => (
                                <DateSection key={date} date={date}>
                                    {logsForDate.map((log) => <AuditLogItem key={log.id} log={log} stagesMap={stagesMap} entitiesMap={entitiesMap} />)}
                                </DateSection>
                            ))}
                        </div>
                    ) : (
                        <p className="py-10 text-center text-muted-foreground">No audit trail records found for the selected filters.</p>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
