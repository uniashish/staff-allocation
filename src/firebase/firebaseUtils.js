import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";

// Using Vite's environment variables for security
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Auth and Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);

// Fetch extra user data (like role and isApproved) from Firestore
export const getUserData = async (uid) => {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
};

// 1. Create a new school sandbox
export const createSchool = async (schoolData) => {
  try {
    const docRef = await addDoc(collection(db, "schools"), {
      ...schoolData,
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding school: ", error);
    throw error;
  }
};

// 2. Fetch all schools for the Dashboard
export const getSchools = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "schools"));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching schools: ", error);
    return [];
  }
};

// 3. Delete a school sandbox
export const deleteSchool = async (id) => {
  try {
    await deleteDoc(doc(db, "schools", id));
  } catch (error) {
    console.error("Error deleting school: ", error);
    throw error;
  }
};

// 4. Update a school sandbox
export const updateSchool = async (schoolId, updatedData) => {
  try {
    const schoolRef = doc(db, "schools", schoolId);
    await updateDoc(schoolRef, {
      ...updatedData,
      updatedAt: new Date(), // Good practice to track updates
    });
  } catch (error) {
    console.error("Error updating school: ", error);
    throw error;
  }
};
