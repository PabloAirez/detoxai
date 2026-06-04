import AsyncStorage from '@react-native-async-storage/async-storage';

export type LocalUser = {
  email: string;
  password: string;
};

const USERS_KEY = '@detoxai/users';
const SESSION_KEY = '@detoxai/session';

async function getUsers() {
  const users = await AsyncStorage.getItem(USERS_KEY);
  return users ? (JSON.parse(users) as LocalUser[]) : [];
}

async function setUsers(users: LocalUser[]) {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function createAccount(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = await getUsers();
  const userExists = users.some((user) => user.email === normalizedEmail);

  if (userExists) {
    throw new Error('E-mail ja cadastrado.');
  }

  const user = { email: normalizedEmail, password };
  await setUsers([...users, user]);
  await startSession(normalizedEmail);
}

export async function login(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = await getUsers();
  const user = users.find(
    (storedUser) => storedUser.email === normalizedEmail && storedUser.password === password,
  );

  if (!user) {
    throw new Error('E-mail ou senha invalidos.');
  }

  await startSession(user.email);
}

export async function startSession(email: string) {
  await AsyncStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      email,
      startedAt: new Date().toISOString(),
    }),
  );
}

export async function getSession() {
  const session = await AsyncStorage.getItem(SESSION_KEY);
  return session ? (JSON.parse(session) as { email: string; startedAt: string }) : null;
}
