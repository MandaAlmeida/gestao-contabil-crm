// src/hooks/useTarefasVencendo.ts
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { useTarefas } from "@/hooks/useTarefas"; // Importa o hook que busca do banco
import { Tarefa } from "@/types/tarefas";

export function useTarefasVencendo(minutosAviso: number = 29) {
  // O próprio hook busca as tarefas diretamente
  const { tarefas } = useTarefas(); 
  
  const [tarefasAlertar, setTarefasAlertar] = useState<Tarefa[]>([]);
  const [tarefasVencida, setTarefasVencida] = useState<Tarefa[]>([]);

  const dispensadasRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const verificarVencimentos = () => {
      // Se ainda não carregou as tarefas, não faz nada
      if (!tarefas || tarefas.length === 0) return;

      const agora = new Date();
      const hojeStr = format(agora, "yyyy-MM-dd");

      // 1. Filtra as tarefas apenas de hoje, não concluídas e que tenham horaFim
      const tarefasHoje = tarefas.filter(
        (t) => t.data.startsWith(hojeStr) && !t.concluida && t.horaFim
      );

      // 2. Verifica quais estão na janela de 20 minutos
      const vencendoAgora = tarefasHoje.filter((t) => {
        if (dispensadasRef.current.has(t.id)) return false;

        const [hora, minuto] = t.horaInicio!.split(":").map(Number);
        
        const horaFimData = new Date(agora);
        horaFimData.setHours(hora, minuto, 0, 0);

        const diferencaMinutos = (horaFimData.getTime() - agora.getTime()) / 60000;

        return diferencaMinutos > 0 && diferencaMinutos <= minutosAviso;
      });

      const vencida = tarefasHoje.filter((t) => {
        if (dispensadasRef.current.has(t.id)) return false;

        const [hora, minuto] = t.horaInicio!.split(":").map(Number);
        
        const horaFimData = new Date(agora);
        horaFimData.setHours(hora, minuto, 0, 0);

        const diferencaMinutos = (horaFimData.getTime() - agora.getTime()) / 60000;

        return diferencaMinutos < 0;
      });

      setTarefasAlertar(vencendoAgora);
      setTarefasVencida(vencida);
    };

    verificarVencimentos();
    const interval = setInterval(verificarVencimentos, 60000);

    return () => clearInterval(interval);
  }, [tarefas, minutosAviso]);

  const dispensarAlerta = (tarefaId: string) => {
    dispensadasRef.current.add(tarefaId);
    setTarefasAlertar((prev) => prev.filter((t) => t.id !== tarefaId));
  };

  // Retorna apenas o que a interface precisa saber
  return { 
    tarefasAlertar, 
    tarefasVencida,
    dispensarAlerta
  };
}