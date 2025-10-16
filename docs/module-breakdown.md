
# Module Breakdown

This document outlines the modular structure of the Workflow CRM application.

## 1. Sales Module

This module encompasses all features related to sales activities.

*   **Lead Management:**
    *   `src/app/(app)/leads/**`: This directory contains all the components and pages related to lead management, including adding, editing, and viewing leads.
*   **Sales Pipeline:**
    *   `src/app/(app)/pipeline/**`: This directory contains the Kanban board and other components for visualizing and managing the sales pipeline.

## 2. AI Sales Gen Module

This module contains the AI-powered features of the application.

*   **"Next Best Action":**
    *   `src/ai/flows/workflow-recommendation.ts`: This file contains the AI flow for suggesting automation rules and next best actions.
    *   `src/app/(app)/next-best-action/page.tsx`: This page displays the "Next Best Action" suggestions to the user.

## 3. User Management Module

This module handles user authentication, authorization, and management.

*   **User Management:**
    *   `src/app/(app)/users/**`: This directory contains the pages and components for adding, editing, and deleting users.
*   **Authentication:**
    *   `src/lib/auth.tsx`: This file contains the core authentication logic.
    *   `src/lib/auth/admin.ts`: This file contains admin-specific authentication logic.
    *   `src/lib/auth/get-authenticated-user.ts`: This file contains logic for retrieving the currently authenticated user.

## 4. Admin Module

This module provides administrative functionalities.

*   **Admin Panel:**
    *   `src/app/(app)/admin/**`: This directory contains all the admin-related pages and components.
*   **Audit Trail:**
    *   `src/app/(app)/audit-trail/page.tsx`: This page displays the audit trail of user actions.
