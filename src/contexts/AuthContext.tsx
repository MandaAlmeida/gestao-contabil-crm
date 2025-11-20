import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  signInWithEmailAndPassword,
  // createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  createUsuarioIfNotExists,
  getUsuarioByEmail,
  updateUsuario,
} from "@/lib/firestore/usuarios";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  // register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (nome: string, telefone?: string) => Promise<void>;
  updateUserEmail: (newEmail: string, password: string) => Promise<void>;
  updateUserPassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);

      if (user) {
        // Sincronizar usuário com a coleção de usuários (de forma assíncrona, sem bloquear)
        const nome = user.displayName || user.email?.split("@")[0] || "Usuário";
        const email = user.email || "";
        if (email) {
          createUsuarioIfNotExists(email, nome).catch((error) => {
            console.error("Erro ao sincronizar usuário (não crítico):", error);
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  // Função de registro comentada
  // const register = async (email: string, password: string, displayName: string) => {
  //   const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  //   if (userCredential.user) {
  //     await updateProfile(userCredential.user, {
  //       displayName,
  //     });
  //   }
  // };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserProfile = async (nome: string, telefone?: string) => {
    if (!user) throw new Error("Usuário não autenticado");

    // Atualizar perfil no Firebase Auth
    await updateProfile(user, {
      displayName: nome,
    });

    // Atualizar no Firestore
    const usuario = await getUsuarioByEmail(user.email || "");
    if (usuario) {
      // Preparar dados de atualização
      const dadosAtualizacao: Record<string, any> = {
        nome,
      };

      // Incluir telefone apenas se fornecido e não vazio
      // Se telefone for string vazia ou undefined, não incluir (será tratado pela função updateUsuario)
      if (telefone !== undefined) {
        if (telefone.trim() !== "") {
          dadosAtualizacao.telefone = telefone.trim();
        } else {
          // String vazia - será removido pela função updateUsuario usando deleteField
          dadosAtualizacao.telefone = "";
        }
      }
      // Se telefone for undefined, não incluir no objeto

      await updateUsuario(usuario.id, dadosAtualizacao);
    }
  };

  const updateUserEmail = async (newEmail: string, password: string) => {
    if (!user || !user.email) throw new Error("Usuário não autenticado");

    // Verificar se o email atual está verificado
    if (!user.emailVerified) {
      throw new Error(
        "Por favor, verifique seu email atual antes de alterá-lo. Verifique sua caixa de entrada ou spam."
      );
    }

    // Buscar usuário no Firestore antes de atualizar (usando email antigo)
    const usuario = await getUsuarioByEmail(user.email);
    const usuarioId = usuario?.id;

    // Reautenticar o usuário
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);

    try {
      // Atualizar email no Firebase Auth
      await updateEmail(user, newEmail);

      // Enviar email de verificação para o novo email
      // Nota: O Firebase pode exigir verificação do novo email antes de permitir login
      // Isso é uma limitação de segurança do Firebase

      // Atualizar no Firestore usando o ID que buscamos antes
      if (usuarioId) {
        await updateUsuario(usuarioId, {
          email: newEmail,
        });
      }
    } catch (error: any) {
      // Se o erro for sobre verificação de email, fornecer mensagem mais clara
      if (error.code === "auth/operation-not-allowed") {
        throw new Error(
          "Não é possível alterar o email. Por favor, verifique seu email atual nas configurações do Firebase ou entre em contato com o administrador."
        );
      }
      throw error;
    }
  };

  const updateUserPassword = async (
    currentPassword: string,
    newPassword: string
  ) => {
    if (!user || !user.email) {
      throw new Error("Usuário não autenticado");
    }

    // Verificar se o usuário tem um provedor de email/senha
    const providers = user.providerData.map((provider) => provider.providerId);
    const hasEmailPassword = providers.includes("password");

    if (!hasEmailPassword) {
      throw new Error(
        "Sua conta foi criada com um provedor externo (Google, Facebook, etc.). " +
          "Para alterar a senha, use a opção de redefinição de senha do seu provedor."
      );
    }

    try {
      // Reautenticar o usuário
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // Atualizar senha
      await updatePassword(user, newPassword);
    } catch (error: any) {
      console.error("Erro ao atualizar senha:", error);

      // Tratar erros específicos do Firebase
      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password"
      ) {
        throw new Error(
          "Senha atual incorreta. Por favor, verifique e tente novamente."
        );
      } else if (error.code === "auth/weak-password") {
        throw new Error(
          "A nova senha é muito fraca. Use uma senha mais forte."
        );
      } else if (error.code === "auth/requires-recent-login") {
        throw new Error(
          "Por segurança, você precisa fazer login novamente antes de alterar a senha."
        );
      } else if (error.message) {
        throw error;
      } else {
        throw new Error("Erro ao atualizar senha. Tente novamente.");
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        resetPassword,
        updateUserProfile,
        updateUserEmail,
        updateUserPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
