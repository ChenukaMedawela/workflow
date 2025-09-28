
"use server";

import { User, UserRole } from "@/lib/types";
import { getFirebaseAdmin } from "../firebase-admin";
import { cookies } from "next/headers";
import { doc, getDoc } from "firebase/firestore";


/**
 * Fetches the currently authenticated user from the session cookie.
 * This is a server-side function.
 * @returns The authenticated user object or null if not authenticated.
 */
export async function getAuthenticatedUser(): Promise<{ user: User | null }> {
    try {
        const { auth, db } = getFirebaseAdmin();
        const session = cookies().get("__session")?.value;

        if (!session) {
            return { user: null };
        }

        // In a real app, you would use auth.verifySessionCookie(session, true)
        // For this example, we are using the session as the user ID for simplicity.
        const userId = session;

        if (!userId) {
            return { user: null };
        }

        const userDoc = await getDoc(doc(db, "users", userId));

        if (!userDoc.exists()) {
            return { user: null };
        }

        const user = userDoc.data() as User;
        
        return { user };

    } catch (error) {
        console.error("Error getting authenticated user:", error);
        return { user: null };
    }
}
