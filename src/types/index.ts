export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string | null;
  provider: 'google' | 'password';
  createdAt: any;
  updatedAt: any;
}

export interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export interface FirebaseAuthError {
  code: string;
  message: string;
}
