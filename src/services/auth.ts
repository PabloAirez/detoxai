import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
  AuthError,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import * as WebBrowser from 'expo-web-browser';
import { getFirebaseAuth, getFirebaseFirestore } from '../../lib/firebase';
import { UserProfile } from '../types';

WebBrowser.maybeCompleteAuthSession();

export const authService = {
  /**
   * Registrar novo usuário com email e senha
   */
  async registerWithEmail(
    email: string,
    password: string,
    name: string
  ): Promise<UserProfile> {
    try {
      const auth = getFirebaseAuth();
      const firestore = getFirebaseFirestore();

      // Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const { uid } = userCredential.user;

      // Criar documento do usuário no Firestore
      const userProfile: UserProfile = {
        uid,
        name,
        email,
        photoURL: null,
        provider: 'password',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(firestore, 'users', uid), userProfile);

      return userProfile;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  },

  /**
   * Login com email e senha
   */
  async loginWithEmail(email: string, password: string): Promise<UserProfile> {
    try {
      const auth = getFirebaseAuth();
      const firestore = getFirebaseFirestore();

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const { uid } = userCredential.user;

      // Buscar perfil do usuário
      const userDoc = await getDoc(doc(firestore, 'users', uid));

      if (!userDoc.exists()) {
        throw new Error('Perfil do usuário não encontrado');
      }

      return userDoc.data() as UserProfile;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  },

  /**
   * Login com Google (compatível com Expo SDK 54)
   * Nota: Esta função espera receber um ID token válido do Google
   * Use expo-auth-session no componente para obter o token
   */
  async loginWithGoogle(idToken: string): Promise<UserProfile> {
    try {
      const auth = getFirebaseAuth();
      const firestore = getFirebaseFirestore();

      // Autenticar no Firebase com o token Google
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);

      const { uid, displayName, email, photoURL } = userCredential.user;

      if (!email) {
        throw new Error('Email não encontrado no perfil do Google');
      }

      // Verificar se o usuário já existe no Firestore
      const userDocRef = doc(firestore, 'users', uid);
      const userDoc = await getDoc(userDocRef);

      let userProfile: UserProfile;

      if (userDoc.exists()) {
        // Usuário já existe, atualizar updatedAt
        userProfile = userDoc.data() as UserProfile;
        await setDoc(
          userDocRef,
          { updatedAt: serverTimestamp() },
          { merge: true }
        );
      } else {
        // Criar novo usuário
        userProfile = {
          uid,
          name: displayName || email.split('@')[0],
          email,
          photoURL: photoURL || null,
          provider: 'google',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(userDocRef, userProfile);
      }

      return userProfile;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  },

  /**
   * Fazer logout
   */
  async logout(): Promise<void> {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  },

  /**
   * Enviar email de reset de senha
   */
  async resetPassword(email: string): Promise<void> {
    try {
      const auth = getFirebaseAuth();
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  },

  /**
   * Obter usuário atualmente autenticado
   */
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    try {
      const auth = getFirebaseAuth();
      const firestore = getFirebaseFirestore();

      const currentUser = auth.currentUser;

      if (!currentUser) {
        return null;
      }

      const userDoc = await getDoc(
        doc(firestore, 'users', currentUser.uid)
      );

      if (!userDoc.exists()) {
        return null;
      }

      return userDoc.data() as UserProfile;
    } catch (error) {
      console.error('Erro ao obter perfil do usuário:', error);
      return null;
    }
  },

  /**
   * Tratamento centralizado de erros de autenticação
   */
  handleAuthError(error: any): Error {
    let message = 'Erro ao processar autenticação';

    if (error instanceof Error) {
      const authError = error as AuthError;

      switch (authError.code) {
        case 'auth/invalid-email':
          message = 'Email inválido';
          break;
        case 'auth/user-not-found':
          message = 'Usuário não encontrado';
          break;
        case 'auth/wrong-password':
          message = 'Senha incorreta';
          break;
        case 'auth/email-already-in-use':
          message = 'Este email já está registrado';
          break;
        case 'auth/weak-password':
          message = 'Senha muito fraca (mínimo 6 caracteres)';
          break;
        case 'auth/too-many-requests':
          message = 'Muitas tentativas de login. Tente novamente mais tarde';
          break;
        case 'auth/user-disabled':
          message = 'Esta conta foi desativada';
          break;
        case 'auth/operation-not-allowed':
          message = 'Operação não permitida';
          break;
        default:
          message = authError.message || message;
      }
    }

    return new Error(message);
  },
};
