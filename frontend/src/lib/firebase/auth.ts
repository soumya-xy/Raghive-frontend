import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  deleteUser,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  onIdTokenChanged,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./client";

export async function signUpWithEmail(email: string, pass: string, displayName: string) {
  const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, pass);
  if (cred.user && displayName) {
    await updateProfile(cred.user, { displayName });
  }
  return cred.user;
}

export async function signInWithEmail(email: string, pass: string) {
  const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, pass);
  return cred.user;
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(getFirebaseAuth(), provider);
  return cred.user;
}

export async function sendPasswordReset(email: string) {
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}

export async function signOutUser() {
  await signOut(getFirebaseAuth());
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

/**
 * Subscribe to ID-token changes. Fires on sign-in/out AND on Firebase's hourly token
 * refresh, so the bearer token the API client sends never goes stale.
 */
export function subscribeToIdToken(callback: (user: User | null) => void) {
  return onIdTokenChanged(getFirebaseAuth(), callback);
}

/** Re-verify the signed-in email/password user's password (Firebase requires a recent sign-in). */
export async function reauthenticateEmail(currentPassword: string) {
  const user = getFirebaseAuth().currentUser;
  if (!user || !user.email) throw new Error("Sign in with email and password to continue.");
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
}

export async function changeEmailPassword(currentPassword: string, newPassword: string) {
  await reauthenticateEmail(currentPassword);
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Not signed in.");
  await updatePassword(user, newPassword);
}

/** Delete the Firebase user. Call reauthenticateEmail first; backend data should be removed before this. */
export async function deleteCurrentFirebaseUser() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Not signed in.");
  await deleteUser(user);
}
