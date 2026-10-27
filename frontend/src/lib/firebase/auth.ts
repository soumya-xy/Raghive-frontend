import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from "firebase/auth";
import { auth } from "./client";

export async function signUpWithEmail(email: string, pass: string, displayName: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  if (cred.user && displayName) {
    await updateProfile(cred.user, { displayName });
  }
  return cred.user;
}

export async function signInWithEmail(email: string, pass: string) {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return cred.user;
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function sendPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function signOutUser() {
  await signOut(auth);
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
