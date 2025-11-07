import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  role: 'student' | 'admin';
  photoURL?: string;
  createdAt: Date;
  lastLogin: Date;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  signup: (email: string, password: string, displayName: string, role: 'student' | 'admin') => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper function to convert Firestore Timestamps to Dates
function convertUserData(data: any): UserData {
  if (!data) return data;
  
  // Convert createdAt if it's a Timestamp
  if (data.createdAt && data.createdAt instanceof Timestamp) {
    data.createdAt = data.createdAt.toDate();
  }
  
  // Convert lastLogin if it's a Timestamp
  if (data.lastLogin && data.lastLogin instanceof Timestamp) {
    data.lastLogin = data.lastLogin.toDate();
  }
  
  return data as UserData;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  async function signup(email: string, password: string, displayName: string, role: 'student' | 'admin') {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName });

      const userDoc: any = {
        uid: user.uid,
        email: user.email!,
        displayName,
        role,
        createdAt: new Date(),
        lastLogin: new Date()
      };

      // Only add photoURL if it exists
      if (user.photoURL) {
        userDoc.photoURL = user.photoURL;
      }

      await setDoc(doc(db, 'users', user.uid), userDoc);
      setUserData(userDoc as UserData);
    } catch (error: any) {
      if (error.code === 'auth/unauthorized-domain') {
        throw new Error('This domain is not authorized for Firebase authentication. Please contact the administrator to add this domain to the Firebase project settings.');
      }
      throw error;
    }
  }

  async function login(email: string, password: string) {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);

      // Update last login
      await setDoc(doc(db, 'users', user.uid), {
        lastLogin: new Date()
      }, { merge: true });
    } catch (error: any) {
      if (error.code === 'auth/unauthorized-domain') {
        throw new Error('This domain is not authorized for Firebase authentication. Please contact the administrator to add this domain to the Firebase project settings.');
      }
      throw error;
    }
  }

  async function loginWithGoogle() {
    try {
      const { user } = await signInWithPopup(auth, googleProvider);

      // Check if user document exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // First time login with Google - create user document
        const newUserData: any = {
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName || 'Google User',
          role: 'student', // Default role
          createdAt: new Date(),
          lastLogin: new Date()
        };

        // Only add photoURL if it exists
        if (user.photoURL) {
          newUserData.photoURL = user.photoURL;
        }

        await setDoc(userDocRef, newUserData);
        setUserData(newUserData as UserData);
      } else {
        // Update last login
        await setDoc(userDocRef, {
          lastLogin: new Date()
        }, { merge: true });
      }
    } catch (error: any) {
      if (error.code === 'auth/unauthorized-domain') {
        throw new Error('This domain is not authorized for Firebase authentication. Please contact the administrator to add this domain to the Firebase project settings.');
      }
      throw error;
    }
  }

  async function logout() {
    setUserData(null);
    await signOut(auth);
  }

  useEffect(() => {
    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Authentication timeout - forcing loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        clearTimeout(timeoutId); // Clear timeout if auth resolves
        console.log('Auth state changed:', user);
        setCurrentUser(user);

        if (user) {
          try {
            // Get user data from Firestore
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            console.log('User document fetched:', userDoc.exists(), userDoc.data());

            if (userDoc.exists()) {
              const data = userDoc.data();
              console.log('Raw user data from Firestore:', data);
              const convertedData = convertUserData(data);
              console.log('Converted user data:', convertedData);
              setUserData(convertedData);
            } else {
              console.log('No user document found - creating fallback userData');
              // Create fallback userData if document doesn't exist
              const fallbackData: UserData = {
                uid: user.uid,
                email: user.email || '',
                displayName: user.displayName || 'User',
                role: 'student', // Default to student
                createdAt: new Date(),
                lastLogin: new Date()
              };
              setUserData(fallbackData);
            }
          } catch (firestoreError) {
            console.error('Firestore error - using fallback userData:', firestoreError);
            // If Firestore fails, create fallback userData so user can still access the app
            const fallbackData: UserData = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'User',
              role: 'admin', // Default to admin for fallback to avoid access issues
              createdAt: new Date(),
              lastLogin: new Date()
            };
            setUserData(fallbackData);
          }
        } else {
          setUserData(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
