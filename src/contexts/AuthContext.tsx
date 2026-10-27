import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  type LocalUser,
  getUsuarioLocal,
  salvarUsuarioLocal,
} from "@/lib/localAuth";
import {
  createUsuarioIfNotExists,
  getUsuarioByEmail,
  updateUsuario,
} from "@/lib/firestore/usuarios";

// Ambiente de teste: não há login. O sistema usa sempre um usuário local fixo.

interface AuthContextType {
  user: LocalUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
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
  const [user, setUser] = useState<LocalUser>(getUsuarioLocal);

  useEffect(() => {
    // Sincronizar usuário com a coleção de usuários
    createUsuarioIfNotExists(user.email, user.displayName).catch((error) => {
      console.error("Erro ao sincronizar usuário (não crítico):", error);
    });
  }, [user.email, user.displayName]);

  const atualizarUsuario = (dados: Partial<LocalUser>) => {
    setUser((atual) => {
      const novo = { ...atual, ...dados };
      salvarUsuarioLocal(novo);
      return novo;
    });
  };

  // Sem login no ambiente de teste
  const login = async () => {};
  const register = async () => {};
  const logout = async () => {};
  const resetPassword = async () => {};

  const updateUserProfile = async (nome: string, telefone?: string) => {
    atualizarUsuario({ displayName: nome });

    const usuario = await getUsuarioByEmail(user.email);
    if (usuario) {
      const dadosAtualizacao: Record<string, any> = {
        nome,
      };

      if (telefone !== undefined) {
        // String vazia - será removido pela função updateUsuario usando deleteField
        dadosAtualizacao.telefone = telefone.trim();
      }

      await updateUsuario(usuario.id, dadosAtualizacao);
    }
  };

  const updateUserEmail = async (newEmail: string) => {
    const usuario = await getUsuarioByEmail(user.email);

    atualizarUsuario({ email: newEmail });

    if (usuario) {
      await updateUsuario(usuario.id, {
        email: newEmail,
      });
    }
  };

  // Não há senha no ambiente de teste
  const updateUserPassword = async () => {};

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: false,
        login,
        register,
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
