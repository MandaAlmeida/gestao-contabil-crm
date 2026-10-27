// Usuário local fixo do ambiente de teste (sem login)

export interface LocalUser {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  providerData: { providerId: string }[];
}

const STORAGE_KEY = "crm-local-auth:usuario";

const USUARIO_PADRAO: LocalUser = {
  uid: "usuario-teste",
  email: "teste@exemplo.com",
  displayName: "Usuário Teste",
  emailVerified: true,
  providerData: [{ providerId: "password" }],
};

export function getUsuarioLocal(): LocalUser {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...USUARIO_PADRAO, ...JSON.parse(raw) };
  } catch {
    // ignora
  }
  return USUARIO_PADRAO;
}

export function salvarUsuarioLocal(user: LocalUser) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    // ignora
  }
}
