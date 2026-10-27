// Dados de exemplo do ambiente de teste.
// São gravados no localStorage apenas na primeira visita; se a pessoa excluir, não voltam.
import { addDays, format } from "date-fns";
import { doc, localDb, writeBatch } from "./localDb";

const FLAG_EXEMPLOS = "crm-local-exemplos-carregados";

// Data relativa a hoje, no formato yyyy-MM-dd usado pelos formulários
const dia = (dias: number) => format(addDays(new Date(), dias), "yyyy-MM-dd");

function montarExemplos(): Record<string, Record<string, Record<string, unknown>>> {
  const agora = new Date().toISOString();
  const base = { ativo: true, createdAt: agora, updatedAt: agora };

  const cliente1 = { id: "exemplo-cliente-1", nome: "Padaria Pão Dourado LTDA", cnpj: "11.222.333/0001-81" };
  const cliente2 = { id: "exemplo-cliente-2", nome: "Mercado Bom Preço ME", cnpj: "44.555.666/0001-99" };

  return {
    usuarios: {
      "exemplo-usuario-1": { ...base, nome: "Usuário Teste", email: "teste@exemplo.com" },
      "exemplo-usuario-2": { ...base, nome: "Carlos Exemplo", email: "carlos@exemplo.com", telefone: "(31) 97777-2222" },
    },

    contabilidades: {
      "exemplo-contabilidade-1": { ...base, nome: "Contábil Horizonte", cnpj: "22.333.444/0001-55", email: "contato@contabilhorizonte.exemplo", cidade: "Belo Horizonte" },
      "exemplo-contabilidade-2": { ...base, nome: "Prime Contabilidade", cnpj: "33.444.555/0001-66", email: "atendimento@primecontabil.exemplo", cidade: "Contagem" },
    },

    clientes: {
      [cliente1.id]: {
        ...base,
        nome: cliente1.nome,
        cnpj: cliente1.cnpj,
        cidade: "Belo Horizonte",
        contato: "(31) 98888-1111",
        contabilidade: "Contábil Horizonte",
        responsavel: "Usuário Teste",
        observacoes: "Cliente de exemplo do ambiente de teste.",
        isFiscal: true,
        isGerencial: false,
      },
      [cliente2.id]: {
        ...base,
        nome: cliente2.nome,
        cnpj: cliente2.cnpj,
        cidade: "Contagem",
        contato: "(31) 97777-3333",
        contabilidade: "Prime Contabilidade",
        responsavel: "Carlos Exemplo",
        observacoes: "Cliente de exemplo do ambiente de teste.",
        isFiscal: false,
        isGerencial: true,
      },
    },

    financeiro: {
      "exemplo-financeiro-1": {
        ...base,
        clienteId: cliente1.id,
        clienteNome: cliente1.nome,
        clienteCNPJ: cliente1.cnpj,
        dataVencimento: dia(5),
        valorMensalidade: 350,
        status: "Pendente",
        dataPagamento: null,
        historicoPagamentos: [],
        meioPagamento: "Pix",
        observacoes: "Mensalidade de exemplo.",
      },
      "exemplo-financeiro-2": {
        ...base,
        clienteId: cliente2.id,
        clienteNome: cliente2.nome,
        clienteCNPJ: cliente2.cnpj,
        dataVencimento: dia(12),
        valorMensalidade: 480,
        status: "Pendente",
        dataPagamento: null,
        historicoPagamentos: [],
        meioPagamento: "Boleto",
        observacoes: "Mensalidade de exemplo.",
      },
    },

    servicos: {
      "exemplo-servico-1": {
        ...base,
        clienteId: cliente1.id,
        clienteNome: cliente1.nome,
        clienteCNPJ: cliente1.cnpj,
        responsavel: "Usuário Teste",
        descricao: "Abertura de filial",
        dataVencimento: dia(10),
        valorMensalidade: 800,
        status: "Pendente",
        dataPagamento: null,
        historicoPagamentos: [],
        meioPagamento: "Pix",
        observacoes: "Serviço de exemplo.",
      },
      "exemplo-servico-2": {
        ...base,
        clienteId: cliente2.id,
        clienteNome: cliente2.nome,
        clienteCNPJ: cliente2.cnpj,
        responsavel: "Carlos Exemplo",
        descricao: "Regularização cadastral",
        dataVencimento: dia(20),
        valorMensalidade: 450,
        status: "Pendente",
        dataPagamento: null,
        historicoPagamentos: [],
        meioPagamento: "Boleto",
        observacoes: "Serviço de exemplo.",
      },
    },

    despesas: {
      "exemplo-despesa-1": {
        ...base,
        descricao: "Aluguel do escritório",
        contabilidade: null,
        valor: 2500,
        data: dia(7),
        fixo: true,
        pago: false,
        dataPagamento: null,
        historicoPagamentos: [],
        recebedor: "Imobiliária Central",
      },
      "exemplo-despesa-2": {
        ...base,
        descricao: "Internet e telefone",
        contabilidade: null,
        valor: 189.9,
        data: dia(15),
        fixo: true,
        pago: false,
        dataPagamento: null,
        historicoPagamentos: [],
        recebedor: "Operadora Exemplo",
      },
    },

    certificados: {
      "exemplo-certificado-1": {
        ...base,
        clienteId: cliente1.id,
        clienteNome: cliente1.nome,
        clienteCNPJ: cliente1.cnpj,
        tipoCertificado: "A1",
        dataVencimento: dia(7),
        status: "Pendente",
        observacoes: "Vence em poucos dias (alerta vermelho).",
        historicoRenovacoes: [],
      },
      "exemplo-certificado-2": {
        ...base,
        clienteId: cliente2.id,
        clienteNome: cliente2.nome,
        clienteCNPJ: cliente2.cnpj,
        tipoCertificado: "A3",
        dataVencimento: dia(25),
        status: "Pendente",
        observacoes: "Vence este mês (alerta amarelo).",
        historicoRenovacoes: [],
      },
    },

    renovacao: {
      "exemplo-renovacao-1": {
        ...base,
        clienteId: cliente1.id,
        clienteNome: cliente1.nome,
        clienteCNPJ: cliente1.cnpj,
        dataRenovacao: dia(15),
        dataPagamento: null,
        valorRenovacao: 250,
        status: "Pendente",
        parcela: null,
        historicoPagamentos: [],
        observacoes: "Renovação de exemplo.",
      },
      "exemplo-renovacao-2": {
        ...base,
        clienteId: cliente2.id,
        clienteNome: cliente2.nome,
        clienteCNPJ: cliente2.cnpj,
        dataRenovacao: dia(40),
        dataPagamento: null,
        valorRenovacao: 300,
        status: "Em Negociação",
        parcela: "2 Vezes",
        historicoPagamentos: [],
        observacoes: "Renovação de exemplo.",
      },
    },

    sintegra: {
      "exemplo-sintegra-1": {
        ...base,
        clienteId: cliente1.id,
        clienteNome: cliente1.nome,
        dataPrazo: dia(3),
        acesso: "AnyDesk 123 456 789",
        status: "Pendente",
        observacoes: "Sintegra de exemplo.",
        dataPagamento: null,
        historicoAtividades: [],
      },
      "exemplo-sintegra-2": {
        ...base,
        clienteId: cliente2.id,
        clienteNome: cliente2.nome,
        dataPrazo: dia(18),
        acesso: "TeamViewer 987 654 321",
        status: "Pendente",
        observacoes: "Sintegra de exemplo.",
        dataPagamento: null,
        historicoAtividades: [],
      },
    },

    anotacoes: {
      "exemplo-anotacao-1": {
        titulo: "Bem-vindo ao ambiente de teste",
        conteudo: "<p>Tudo o que você cadastrar aqui fica salvo apenas neste navegador.</p>",
        cor: "#1e293b",
        corTexto: "#ffffff",
        tamanhoTexto: 18,
        usuarioId: "usuario-teste",
        criadoEm: agora,
        atualizadoEm: agora,
      },
      "exemplo-anotacao-2": {
        titulo: "Lembretes do mês",
        conteudo: "<p>Conferir certificados vencendo e enviar o Sintegra da Padaria Pão Dourado.</p>",
        cor: "#F9F871",
        corTexto: "#18181b",
        tamanhoTexto: 18,
        usuarioId: "usuario-teste",
        criadoEm: agora,
        atualizadoEm: agora,
      },
    },

    tarefas: {
      "exemplo-tarefa-1": {
        ...base,
        titulo: "Ligar para a Padaria Pão Dourado",
        descricao: "Avisar sobre o vencimento do certificado digital.",
        data: dia(0),
        horaInicio: "09:00",
        horaFim: "09:30",
        concluida: false,
        prioridade: "Alta",
        categoria: "Certificado",
        clienteId: cliente1.id,
        clienteNome: cliente1.nome,
      },
      "exemplo-tarefa-2": {
        ...base,
        titulo: "Reunião com o Mercado Bom Preço",
        descricao: "Negociar a renovação anual.",
        data: dia(2),
        horaInicio: "14:00",
        horaFim: "15:00",
        concluida: false,
        prioridade: "Média",
        categoria: "Renovação",
        clienteId: cliente2.id,
        clienteNome: cliente2.nome,
      },
    },
  };
}

function exemplosJaCarregados(): boolean {
  try {
    return localStorage.getItem(FLAG_EXEMPLOS) === "true";
  } catch {
    return false;
  }
}

export async function carregarDadosExemplo(): Promise<void> {
  if (exemplosJaCarregados()) return;

  const batch = writeBatch(localDb);
  for (const [colecao, docs] of Object.entries(montarExemplos())) {
    for (const [id, dados] of Object.entries(docs)) {
      batch.set(doc(localDb, colecao, id), dados);
    }
  }
  await batch.commit();

  try {
    localStorage.setItem(FLAG_EXEMPLOS, "true");
  } catch {
    // ignora
  }
}
