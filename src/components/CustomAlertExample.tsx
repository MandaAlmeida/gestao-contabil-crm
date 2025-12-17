import * as React from "react";
import { Button } from "@/components/ui/button";
import { CustomAlert, useCustomAlert, AlertContainer } from "@/components/CustomAlert";

export function CustomAlertExample() {
  const { alerts, showAlert, dismissAlert } = useCustomAlert();

  const handleShowSuccess = () => {
    showAlert("success", "Sucesso!", "Operação realizada com sucesso.");
  };

  const handleShowError = () => {
    showAlert("destructive", "Erro!", "Ocorreu um erro inesperado.");
  };

  const handleShowWarning = () => {
    showAlert("warning", "Atenção!", "Verifique os dados antes de continuar.");
  };

  const handleShowInfo = () => {
    showAlert("info", "Informação", "Esta é uma mensagem informativa.");
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-bold">Exemplos de CustomAlert</h2>

      {/* Alertas Inline (estáticos) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Alertas Inline (Estáticos)</h3>

        <CustomAlert variant="success" title="Sucesso!" dismissible>
          <p>Seu arquivo foi enviado com sucesso!</p>
        </CustomAlert>

        <CustomAlert variant="destructive" title="Erro" dismissible>
          <p>Não foi possível conectar ao servidor. Tente novamente.</p>
        </CustomAlert>

        <CustomAlert variant="warning" title="Atenção" showIcon={false}>
          <p>Esta ação não pode ser desfeita.</p>
        </CustomAlert>

        <CustomAlert variant="info">
          <p>Informações importantes sobre o sistema.</p>
        </CustomAlert>
      </div>

      {/* Alertas Temporários (Toast-like) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Alertas Temporários (Toast)</h3>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleShowSuccess} variant="default">
            Mostrar Sucesso
          </Button>
          <Button onClick={handleShowError} variant="destructive">
            Mostrar Erro
          </Button>
          <Button onClick={handleShowWarning} variant="secondary">
            Mostrar Aviso
          </Button>
          <Button onClick={handleShowInfo} variant="outline">
            Mostrar Info
          </Button>
        </div>

        {/* Container para os alertas temporários */}
        <AlertContainer
          alerts={alerts}
          onDismiss={dismissAlert}
          position="top-right"
        />
      </div>

      {/* Alertas com conteúdo personalizado */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Alertas com Conteúdo Personalizado</h3>

        <CustomAlert variant="success" title="Pagamento Aprovado">
          <div className="space-y-2">
            <p>O pagamento de R$ 1.250,00 foi processado com sucesso.</p>
            <div className="text-xs text-muted-foreground">
              <p>ID da transação: TXN-2024-001</p>
              <p>Data: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </CustomAlert>

        <CustomAlert variant="warning" title="Limite Atingido">
          <div className="space-y-2">
            <p>Você atingiu 80% do seu limite mensal.</p>
            <Button size="sm" variant="outline">
              Ver Detalhes
            </Button>
          </div>
        </CustomAlert>
      </div>
    </div>
  );
}
