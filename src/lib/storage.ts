import { storage, db } from './firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc } from 'firebase/firestore';

/**
 * Uploads a Base64 image to Firebase Cloud Storage
 * @param base64String Full Base64 string (e.g., "data:image/png;base64,iVBORw...")
 * @param path Storage path (e.g., "assets/locations/my-loc-id.png")
 * @returns Promise resolving to the public download URL
 */
export async function uploadImageToStorage(base64String: string, path: string): Promise<string> {
    if (!storage) throw new Error("Firebase Storage not initialized");
    try {
        const storageRef = ref(storage, path);
        // uploadString automatically handles data_url format
        await uploadString(storageRef, base64String, 'data_url');
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading image to Firebase:", error);
        throw error;
    }
}

/**
 * Saves a document to Firestore
 * @param collectionName Collection name (e.g., "assets_locations")
 * @param docId Document ID
 * @param data Data object
 */
export async function saveToFirestore(collectionName: string, docId: string, data: any): Promise<void> {
    if (!db) throw new Error("Firebase Firestore not initialized");
    try {
        const docRef = doc(db, collectionName, docId);
        // Use setDoc with merge: true to avoid overwriting existing fields if not intended,
        // but for assets we usually want to update the whole record or specific variations.
        // Here we default to merge to be safe.
        await setDoc(docRef, data, { merge: true });
    } catch (error) {
        console.error("Error saving to Firestore:", error);
        throw error;
    }
}

/**
 * Retrieves a document from Firestore
 */
export async function getFromFirestore(collectionName: string, docId: string): Promise<any | null> {
    if (!db) {
        console.error("Firebase Firestore not initialized");
        return null;
    }
    try {
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error reading from Firestore:", error);
        return null;
    }
}
