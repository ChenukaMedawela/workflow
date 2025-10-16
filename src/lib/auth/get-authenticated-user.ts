
"use server";

import { User, UserRole } from "@/lib/types";
import { auth, db } from "../firebase-admin";
import { cookies } from "next/headers";
import { doc, getDoc } from "firebase/firestore";


/**
 * Fetches the currently authenticated user from the session cookie.
 * This is a server-side function.
 * @returns The authenticated user object or null if not authenticated.
 */
export async function getAuthenticatedUser(): Promise<{ user: User | null }> {
    try {
        const session = cookies().get("__session")?.value;

        if (!session) {
            return { user: null };
        }
        
        const decodedIdToken = await auth.verifySessionCookie(session, true);
        const userId = decodedIdToken.uid;

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
