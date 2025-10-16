"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = seedDatabase;
const firebase_admin_1 = require("./firebase-admin");
const { db } = (0, firebase_admin_1.getFirebaseAdmin)();
async function seedDatabase() {
    console.log('Seeding database...');
    // 1. Create Roles
    const roles = ['Super Admin', 'Admin', 'User'];
    const rolesRef = db.collection('roles');
    const existingRoles = await rolesRef.get();
    if (existingRoles.empty) {
        for (const role of roles) {
            await rolesRef.add({ name: role });
        }
        console.log('Added roles to the database.');
    }
    else {
        console.log('Roles already exist in the database.');
    }
    // 2. Create a default Entity
    const entitiesRef = db.collection('entities');
    let defaultEntityId = '';
    const defaultEntity = await entitiesRef.where('name', '==', 'Default Entity').get();
    if (defaultEntity.empty) {
        const docRef = await entitiesRef.add({ name: 'Default Entity' });
        defaultEntityId = docRef.id;
        console.log('Added default entity to the database.');
    }
    else {
        defaultEntityId = defaultEntity.docs[0].id;
        console.log('Default entity already exists.');
    }
    // 3. Create Pipeline Stages
    const stagesRef = db.collection('pipelineStages');
    const existingStages = await stagesRef.get();
    const stageNames = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];
    let stageIds = {};
    if (existingStages.empty) {
        for (let i = 0; i < stageNames.length; i++) {
            const stage = { name: stageNames[i], order: i, isIsolated: false };
            const docRef = await stagesRef.add(stage);
            stageIds[stageNames[i]] = docRef.id;
        }
        console.log('Added pipeline stages to the database.');
    }
    else {
        console.log('Pipeline stages already exist.');
        for (const doc of existingStages.docs) {
            const data = doc.data();
            stageIds[data.name] = doc.id;
        }
    }
    // 4. Create Sample Leads
    const leadsRef = db.collection('leads');
    const existingLeads = await leadsRef.get();
    if (existingLeads.empty) {
        const leads = [
            {
                accountName: 'TechCorp',
                stageId: stageIds['New'],
                sector: 'Technology',
                ownerEntityId: defaultEntityId,
                contractType: 'Annual',
                contractStartDate: new Date('2024-08-01').toISOString(),
                contractEndDate: new Date('2025-07-31').toISOString(),
                stageHistory: [{ stageId: stageIds['New'], timestamp: new Date().toISOString() }]
            },
            {
                accountName: 'HealthWell',
                stageId: stageIds['Contacted'],
                sector: 'Healthcare',
                ownerEntityId: defaultEntityId,
                contractType: 'Monthly',
                contractStartDate: new Date('2024-09-15').toISOString(),
                contractEndDate: new Date('2025-09-14').toISOString(),
                stageHistory: [{ stageId: stageIds['Contacted'], timestamp: new Date().toISOString() }]
            },
            {
                accountName: 'EduPro',
                stageId: stageIds['Qualified'],
                sector: 'Education',
                ownerEntityId: defaultEntityId,
                contractType: 'One-Time',
                contractStartDate: new Date('2024-07-20').toISOString(),
                contractEndDate: new Date('2024-08-20').toISOString(),
                stageHistory: [{ stageId: stageIds['Qualified'], timestamp: new Date().toISOString() }]
            },
        ];
        for (const lead of leads) {
            await leadsRef.add(lead);
        }
        console.log('Added sample leads to the database.');
    }
    else {
        console.log('Leads already exist in the database.');
    }
    // 5. Create Users
    const usersRef = db.collection('users');
    const superAdminEmail = 'superadmin@example.com';
    const existingSuperAdmin = await usersRef.where('email', '==', superAdminEmail).get();
    if (existingSuperAdmin.empty) {
        const superAdmin = {
            email: superAdminEmail,
            name: 'Super Admin',
            roles: ['Super Admin'],
            entityId: defaultEntityId,
            approved: true,
        };
        await usersRef.add(superAdmin);
        console.log('Created Super Admin user.');
    }
    else {
        console.log('Super Admin user already exists.');
    }
    const adminEmail = 'admin@example.com';
    const existingAdmin = await usersRef.where('email', '==', adminEmail).get();
    if (existingAdmin.empty) {
        const adminUser = {
            email: adminEmail,
            name: 'Admin User',
            roles: ['Admin'],
            entityId: defaultEntityId,
            approved: true,
        };
        await usersRef.add(adminUser);
        console.log('Created Admin user.');
    }
    else {
        console.log('Admin user already exists.');
    }
    const userEmail = 'user@example.com';
    const existingUser = await usersRef.where('email', '==', userEmail).get();
    if (existingUser.empty) {
        const regularUser = {
            email: userEmail,
            name: 'Regular User',
            roles: ['User'],
            entityId: defaultEntityId,
            approved: true,
        };
        await usersRef.add(regularUser);
        console.log('Created Regular user.');
    }
    else {
        console.log('Regular user already exists.');
    }
    console.log('Database seeding finished.');
}
