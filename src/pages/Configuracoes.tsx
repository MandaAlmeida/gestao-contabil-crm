import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Shield,
  Globe,
  Loader2,
  Mail,
  Lock,
  Save,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { getUsuarioByEmail, updateUsuario } from "@/lib/firestore/usuarios";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PushNotificationSettings } from "@/components/PushNotificationPrompt";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function Configuracoes() {
  const { user, updateUserProfile, updateUserEmail, updateUserPassword } =
    useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Estados do formulário de perfil
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");

  // Estados do formulário de senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [senhaConfirmar, setSenhaConfirmar] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  // Estados do formulário de email
  const [novoEmail, setNovoEmail] = useState("");
  const [senhaParaEmail, setSenhaParaEmail] = useState("");
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  // Estados das preferências de notificação
  const [notificacoesEmail, setNotificacoesEmail] = useState(false);
  const [notificacoesRenovacoes, setNotificacoesRenovacoes] = useState(true);
  const [notificacoesPagamentos, setNotificacoesPagamentos] = useState(true);
  const [notificacoesClientes, setNotificacoesClientes] = useState(false);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);

  // Hook para notificações push
  const {
    token: pushToken,
    permission: pushPermission,
    isSupported: pushIsSupported,
  } = usePushNotifications();

  // Carregar dados do usuário
  useEffect(() => {
    const loadUserData = async () => {
      if (user?.email) {
        try {
          setLoadingProfile(true);
          const usuario = await getUsuarioByEmail(user.email);
          if (usuario) {
            setUsuarioId(usuario.id);
            setNome(usuario.nome);
            setEmail(usuario.email);
            setTelefone(usuario.telefone || "");
            // Carregar preferências de notificação
            setNotificacoesEmail(usuario.notificacoesEmail ?? false);
            setNotificacoesRenovacoes(usuario.notificacoesRenovacoes ?? true);
            setNotificacoesPagamentos(usuario.notificacoesPagamentos ?? true);
            setNotificacoesClientes(usuario.notificacoesClientes ?? false);
          } else {
            // Se não encontrou no Firestore, usar dados do Auth
            setNome(user.displayName || user.email.split("@")[0]);
            setEmail(user.email);
          }
        } catch (error) {
          console.error("Erro ao carregar dados do usuário:", error);
          toast({
            title: "Erro ao carregar dados",
            variant: "destructive",
          });
        } finally {
          setLoadingProfile(false);
        }
      }
    };

    loadUserData();
  }, [user, toast]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      await updateUserProfile(nome, telefone || undefined);
      toast({
        title: "Perfil atualizado com sucesso!",
        description: "Suas informações foram salvas.",
      });
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      toast({
        title: "Erro ao atualizar perfil",
        description:
          error.message || "Ocorreu um erro ao atualizar seu perfil.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Verificar se o email atual está verificado
    if (!user.emailVerified) {
      toast({
        title: "Email não verificado",
        description:
          "Por favor, verifique seu email atual antes de alterá-lo. Verifique sua caixa de entrada ou spam.",
        variant: "destructive",
      });
      return;
    }

    if (!novoEmail || !senhaParaEmail) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o novo email e sua senha atual.",
        variant: "destructive",
      });
      return;
    }

    if (novoEmail === user.email) {
      toast({
        title: "Email igual",
        description: "O novo email deve ser diferente do atual.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await updateUserEmail(novoEmail, senhaParaEmail);
      setEmail(novoEmail);
      setNovoEmail("");
      setSenhaParaEmail("");
      setShowEmailDialog(false);
      toast({
        title: "Email atualizado com sucesso!",
        description:
          "Seu email foi alterado. Você precisará fazer login novamente.",
      });
      // Recarregar a página após um breve delay para aplicar as mudanças
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error("Erro ao atualizar email:", error);
      let errorMessage = "Ocorreu um erro ao atualizar seu email.";
      if (error.code === "auth/wrong-password") {
        errorMessage = "Senha incorreta. Tente novamente.";
      } else if (error.code === "auth/email-already-in-use") {
        errorMessage = "Este email já está em uso por outra conta.";
      } else if (error.code === "auth/operation-not-allowed") {
        errorMessage =
          "A alteração de email não está habilitada. Entre em contato com o administrador.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({
        title: "Erro ao atualizar email",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!senhaAtual || !senhaNova || !senhaConfirmar) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos de senha.",
        variant: "destructive",
      });
      return;
    }

    if (senhaNova !== senhaConfirmar) {
      toast({
        title: "Senhas não coincidem",
        description: "A nova senha e a confirmação devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    if (senhaNova.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await updateUserPassword(senhaAtual, senhaNova);
      setSenhaAtual("");
      setSenhaNova("");
      setSenhaConfirmar("");
      setShowPasswordDialog(false);
      toast({
        title: "Senha atualizada com sucesso!",
        description: "Sua senha foi alterada.",
      });
    } catch (error: any) {
      console.error("Erro ao atualizar senha:", error);
      let errorMessage = "Ocorreu um erro ao atualizar sua senha.";

      // Tratar mensagens de erro mais específicas
      if (error.message) {
        errorMessage = error.message;
      } else if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password"
      ) {
        errorMessage =
          "Senha atual incorreta. Por favor, verifique e tente novamente.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "A nova senha é muito fraca. Use uma senha mais forte.";
      } else if (error.code === "auth/requires-recent-login") {
        errorMessage =
          "Por segurança, você precisa fazer login novamente antes de alterar a senha.";
      }

      toast({
        title: "Erro ao atualizar senha",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <Layout>
        <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  // Função para obter iniciais do nome
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Função para salvar preferências de notificação
  const handleSaveNotificationPreferences = async (preferences: {
    notificacoesEmail?: boolean;
    notificacoesPush?: boolean;
    notificacoesRenovacoes?: boolean;
    notificacoesPagamentos?: boolean;
    notificacoesClientes?: boolean;
    pushToken?: string;
  }) => {
    if (!usuarioId) {
      toast({
        title: "Erro",
        description: "Usuário não encontrado.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateUsuario(usuarioId, preferences);

      // Salvar token FCM se disponível
      if (pushToken && pushPermission === "granted") {
        await updateUsuario(usuarioId, {
          notificacoesPush: true,
          pushToken,
        });
      }
    } catch (error: any) {
      console.error("Erro ao salvar preferências:", error);
      throw error;
    }
  };

  // Função para lidar com mudança de outras notificações (salva automaticamente)
  const handleNotificationChange = async (
    type: "email" | "renovacoes" | "pagamentos" | "clientes",
    checked: boolean
  ) => {
    const updates: Record<string, boolean> = {};

    switch (type) {
      case "email":
        setNotificacoesEmail(checked);
        updates.notificacoesEmail = checked;
        break;
      case "renovacoes":
        setNotificacoesRenovacoes(checked);
        updates.notificacoesRenovacoes = checked;
        break;
      case "pagamentos":
        setNotificacoesPagamentos(checked);
        updates.notificacoesPagamentos = checked;
        break;
      case "clientes":
        setNotificacoesClientes(checked);
        updates.notificacoesClientes = checked;
        break;
    }

    // Salvar automaticamente quando mudar
    if (usuarioId) {
      try {
        await handleSaveNotificationPreferences(updates);
      } catch (error: any) {
        // Reverter mudança se falhar
        switch (type) {
          case "email":
            setNotificacoesEmail(!checked);
            break;
          case "renovacoes":
            setNotificacoesRenovacoes(!checked);
            break;
          case "pagamentos":
            setNotificacoesPagamentos(!checked);
            break;
          case "clientes":
            setNotificacoesClientes(!checked);
            break;
        }
        toast({
          title: "Erro ao salvar preferências",
          description:
            error.message || "Ocorreu um erro ao salvar suas preferências.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6 ">
        <div className="grid gap-5">
          {/* Perfil do Usuário */}
          <Card className="border shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl mb-1">Perfil do Usuário</CardTitle>
              <CardDescription>
                Atualize suas informações pessoais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-20 w-20 border-2 border-background shadow-md">
                  <AvatarFallback className="text-xl font-semibold bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                    {nome ? getInitials(nome) : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-start">
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <p className="text-sm font-medium">{email}</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-sm font-medium">
                    Nome Completo *
                  </Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone" className="text-sm font-medium">
                    Telefone
                  </Label>
                  <Input
                    id="telefone"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="data-nascimento"
                    className="text-sm font-medium"
                  >
                    Data de Nascimento
                  </Label>
                  <div className="relative">
                    <Input
                      id="data-nascimento"
                      type="date"
                      value={dataNascimento}
                      onChange={(e) => setDataNascimento(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                </div>

                <div className="flex justify-start pt-4">
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Perfil
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Preferências */}
          <Card className="border shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <Globe className="h-5 w-5 text-gray-500" />
                <div>
                  <CardTitle className="text-lg">Preferências</CardTitle>
                  <CardDescription className="text-sm">
                    Configure suas preferências gerais
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="space-y-0.5 flex-1">
                  <Label
                    htmlFor="notificacoes-email"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Notificações por E-mail
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receba notificações importantes por e-mail
                  </p>
                </div>
                <Switch
                  id="notificacoes-email"
                  checked={notificacoesEmail}
                  onCheckedChange={(checked) =>
                    handleNotificationChange("email", checked)
                  }
                  disabled={loading}
                />
              </div>
              <Separator />
              <div className="p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                <PushNotificationSettings />
              </div>
            </CardContent>
          </Card>

          {/* Notificações */}
          <Card className="border shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <Bell className="h-5 w-5 text-gray-500" />
                <div>
                  <CardTitle className="text-lg">Notificações</CardTitle>
                  <CardDescription className="text-sm">
                    Configure quais notificações você deseja receber
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="space-y-0.5 flex-1">
                  <Label
                    htmlFor="renovacoes"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Renovações
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Notificações sobre renovações de certificados
                  </p>
                </div>
                <Switch
                  id="renovacoes"
                  checked={notificacoesRenovacoes}
                  onCheckedChange={(checked) =>
                    handleNotificationChange("renovacoes", checked)
                  }
                  disabled={loading}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="space-y-0.5 flex-1">
                  <Label
                    htmlFor="pagamentos"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Pagamentos
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Notificações sobre pagamentos e recebimentos
                  </p>
                </div>
                <Switch
                  id="pagamentos"
                  checked={notificacoesPagamentos}
                  onCheckedChange={(checked) =>
                    handleNotificationChange("pagamentos", checked)
                  }
                  disabled={loading}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="space-y-0.5 flex-1">
                  <Label
                    htmlFor="clientes"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Novos Clientes
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Notificações sobre novos clientes cadastrados
                  </p>
                </div>
                <Switch
                  id="clientes"
                  checked={notificacoesClientes}
                  onCheckedChange={(checked) =>
                    handleNotificationChange("clientes", checked)
                  }
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Segurança */}
          <Card className="border shadow-md hover:shadow-lg transition-shadow border-red-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <Shield className="h-5 w-5 text-gray-500" />
                <div>
                  <CardTitle className="text-lg">Segurança</CardTitle>
                  <CardDescription className="text-sm">
                    Gerencie a segurança da sua conta
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-md bg-muted/30 border border-border">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">
                        Senha da Conta
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground pl-6">
                      Altere sua senha periodicamente para manter sua conta
                      segura
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowPasswordDialog(true)}
                    variant="outline"
                    size="sm"
                    className="ml-4"
                  >
                    <Lock className="mr-1.5 h-3.5 w-3.5" />
                    Alterar Senha
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="p-3 rounded-md bg-muted/30 border border-border">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">
                        Email da Conta
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground pl-6">
                      Atualize o email associado à sua conta
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      if (user && !user.emailVerified) {
                        toast({
                          title: "Email não verificado",
                          description:
                            "Por favor, verifique seu email atual antes de alterá-lo.",
                          variant: "destructive",
                        });
                      } else {
                        setShowEmailDialog(true);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="ml-4"
                  >
                    <Mail className="mr-1.5 h-3.5 w-3.5" />
                    Alterar Email
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog para alterar senha */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-[450px]" onCloseAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-md bg-red-500/10">
                <Lock className="h-4 w-4 text-red-500" />
              </div>
              <DialogTitle className="text-lg">Alterar Senha</DialogTitle>
            </div>
            <DialogDescription className="text-sm">
              Digite sua senha atual e a nova senha desejada
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePassword} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="senha-atual" className="text-sm font-medium">
                Senha Atual
              </Label>
              <Input
                id="senha-atual"
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                required
                placeholder="Digite sua senha atual"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha-nova" className="text-sm font-medium">
                Nova Senha
              </Label>
              <Input
                id="senha-nova"
                type="password"
                value={senhaNova}
                onChange={(e) => setSenhaNova(e.target.value)}
                required
                minLength={6}
                placeholder="Mínimo de 6 caracteres"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha-confirmar" className="text-sm font-medium">
                Confirmar Nova Senha
              </Label>
              <Input
                id="senha-confirmar"
                type="password"
                value={senhaConfirmar}
                onChange={(e) => setSenhaConfirmar(e.target.value)}
                required
                minLength={6}
                placeholder="Confirme sua nova senha"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setSenhaAtual("");
                  setSenhaNova("");
                  setSenhaConfirmar("");
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} size="sm">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-3.5 w-3.5" />
                    Alterar Senha
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para alterar email */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[450px]" onCloseAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-md bg-blue-500/10">
                <Mail className="h-4 w-4 text-blue-500" />
              </div>
              <DialogTitle className="text-lg">Alterar E-mail</DialogTitle>
            </div>
            <DialogDescription className="text-sm">
              Digite seu novo email e sua senha atual para confirmar
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateEmail} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="novo-email" className="text-sm font-medium">
                Novo E-mail
              </Label>
              <Input
                id="novo-email"
                type="email"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                placeholder="novo@email.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha-email" className="text-sm font-medium">
                Senha Atual
              </Label>
              <Input
                id="senha-email"
                type="password"
                value={senhaParaEmail}
                onChange={(e) => setSenhaParaEmail(e.target.value)}
                required
                placeholder="Digite sua senha para confirmar"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowEmailDialog(false);
                  setNovoEmail("");
                  setSenhaParaEmail("");
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} size="sm">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-3.5 w-3.5" />
                    Alterar E-mail
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
