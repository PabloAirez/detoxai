import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase';

export type LocalUser = {
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type LocalSession = {
  email: string;
  startedAt: string;
};

const SESSION_KEY = '@detoxai/session';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function emailKey(email: string) {
  return normalizeEmail(email).replaceAll('.', ',');
}

function userDoc(email: string) {
  return doc(getFirebaseFirestore(), 'users', emailKey(email));
}

async function hashPassword(password: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
}

export async function createAccount(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const snapshot = await getDoc(userDoc(normalizedEmail));

  if (snapshot.exists()) {
    throw new Error('E-mail ja cadastrado.');
  }

  await setDoc(userDoc(normalizedEmail), {
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  } satisfies LocalUser);

  await startSession(normalizedEmail);
}

export async function login(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const snapshot = await getDoc(userDoc(normalizedEmail));

  if (!snapshot.exists()) {
    throw new Error('E-mail ou senha invalidos.');
  }

  const user = snapshot.data() as LocalUser;
  const passwordHash = await hashPassword(password);

  if (user.passwordHash !== passwordHash) {
    throw new Error('E-mail ou senha invalidos.');
  }

  await startSession(user.email);
}

export async function startSession(email: string) {
  await AsyncStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      email: normalizeEmail(email),
      startedAt: new Date().toISOString(),
    } satisfies LocalSession),
  );
}

export async function getSession() {
  const session = await AsyncStorage.getItem(SESSION_KEY);
  return session ? (JSON.parse(session) as LocalSession) : null;
}

export async function deleteSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
  return;
}
