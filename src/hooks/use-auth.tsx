
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, UserRole } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, updateProfile, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc } from "firebase/firestore";
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { logAudit } from '@/lib/audit-log';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (email: string, password: string, name: string, entityId?: string, role?: UserRole) => Promise<User>;
  loading: boolean;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const setSessionCookie = (token: string | null) => {
    if (token) {
        // In a real app, you would set httpOnly cookie from the server
        document.cookie = `__session=${token}; path=/; max-age=3600`;
    } else {
        document.cookie = '__session=; path=/; max-age=-1';
    }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
            const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data() as User;
                setUser(userData);
                setSessionCookie(firebaseUser.uid);
            } else {
                 const isSigningUp = sessionStorage.getItem('isSigningUp');
                 if (!isSigningUp) {
                    setUser(null);
                    setSessionCookie(null);
                 }
            }
        } catch (error: any) {
            if (error.code === 'permission-denied' || (error.message && error.message.includes("permission-denied"))) {
              const permissionError = new FirestorePermissionError({
                path: `users/${firebaseUser.uid}`,
                operation: 'get',
              });
              errorEmitter.emit('permission-error', permissionError);
            } else {
              console.error("Error fetching user document:", error);
            }
            setUser(null);
            setSessionCookie(null);
        } finally {
            setLoading(false);
            sessionStorage.removeItem('isSigningUp');
        }
      } else {
        setUser(null);
        setSessionCookie(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        await logAudit({ action: 'login', user: userData });
        setSessionCookie(firebaseUser.uid);
        setUser(userData)
      }
    } catch (error) {
      console.error("Error during login:", error);
      throw error;
    }
  };
  
  const signup = async (email: string, password: string, name: string, entityId?: string, role: UserRole = 'Viewer') => {
    sessionStorage.setItem('isSigningUp', 'true');
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        await updateProfile(firebaseUser, {
            displayName: name,
        });
        
        const newUser: User = {
            id: firebaseUser.uid,
            name: name,
            email: email,
            avatarUrl: `https://i.pravatar.cc/150?u=${firebaseUser.uid}`,
            role: 'pending' as UserRole,
            status: 'pending',
            ...(entityId && entityId !== 'global' && { entityId: entityId }),
        };

        const userDocRef = doc(db, "users", firebaseUser.uid);

        await setDoc(userDocRef, newUser);

        setUser(newUser); // Manually set user in context after signup
        return newUser;
    } catch (error) {
        if (error instanceof Error && (error as any).code === 'permission-denied') {
            const userDocRef = doc(db, "users", auth.currentUser?.uid || 'unknown');
            const permissionError = new FirestorePermissionError({
              path: userDocRef.path,
              operation: 'create',
              requestResourceData: { email, name, entityId, role },
            });
            errorEmitter.emit('permission-error', permissionError);
          }
          // Re-throw other errors
          throw error;
    } finally {
        sessionStorage.removeItem('isSigningUp');
    }
  };

  const logout = async () => {
    if (user) {
        await logAudit({ action: 'logout', user });
    }
    await signOut(auth);
    router.push('/login');
  };
  
  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    // Also check for status if it exists
    if ('status' in user && user.status !== 'approved') return false;
    return roles.includes(user.role);
  };

  const value = { user, login, logout, signup, loading, hasRole };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
