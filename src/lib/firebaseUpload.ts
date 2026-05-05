import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Upload a file to Firebase Storage and return the download URL
 * @param file - The File object to upload
 * @param folder - The folder name in Storage (e.g., 'avatars', 'posts', 'albums')
 * @returns The download URL of the uploaded file
 */
export async function uploadFileToFirebase(
  file: File,
  folder: string
): Promise<string> {
  // Validate file
  if (!file) {
    throw new Error('No file provided');
  }

  // Create a reference with timestamp to ensure uniqueness
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  const fileName = `${timestamp}_${randomStr}_${file.name}`;
  const storageRef = ref(storage, `${folder}/${fileName}`);

  try {
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Firebase upload error:', error);
    throw new Error('Failed to upload file to Firebase Storage');
  }
}
