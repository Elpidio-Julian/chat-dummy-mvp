import { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  collection,
  doc,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up function
  const signup = async (email, password) => {
    try {
      // First create the auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Use a batch write for the user document
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', user.uid);
      
      batch.set(userRef, {
        uid: user.uid,
        email: user.email,
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        onlineStatus: true
      });

      try {
        await batch.commit();
      } catch (firestoreError) {
        console.error('Firestore Error:', firestoreError);
        // Continue even if Firestore fails
      }

      return user;
    } catch (error) {
      console.error('Signup Error:', error);
      throw error;
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      console.error('Login Error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout Error:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 