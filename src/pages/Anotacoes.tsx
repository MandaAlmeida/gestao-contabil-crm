import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  criarAnotacao,
  listarAnotacoes,
  atualizarAnotacao,
  deletarAnotacao,
  Anotacao as AnotacaoFirebase,
} from "@/lib/firestore/anotacoes";

interface Nota {
  id: string;
  titulo: string;
  conteudo: string;
  cor: string;
  corTexto: string;
  tamanhoTexto: number;
}

const cores = [
  '#18181b', // dark
  '#27272a', // dark
  '#3b3b3b', // dark
  '#1e293b', // dark blue
  '#334155', // dark blue
  '#64748b', // gray blue
  '#F9F871', // light yellow
  '#A7F3D0', // light green
  '#FCA5A5', // light red
  '#BFDBFE', // light blue
  '#FCD34D', // light gold
  '#E9D5FF', // light purple
];


export default function Anotacoes() {
  const { user } = useAuth();
  const [notas, setNotas] = useState<Nota[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [cor, setCor] = useState(cores[0]);
  const [corTexto, setCorTexto] = useState('#ffffff');
  const [tamanhoTexto, setTamanhoTexto] = useState(18);
  // Novo estado para controlar anotação aberta
  const [anotacaoAberta, setAnotacaoAberta] = useState<Nota | null>(null);
  const [editando, setEditando] = useState(false);

  React.useEffect(() => {
    async function fetchNotas() {
      if (!user) {
        setNotas([]);
        return;
      }
      const notasDb = await listarAnotacoes(user.uid);
      setNotas(
        notasDb
          .filter(n => !!n.id)
          .map(n => ({
            id: n.id!,
            titulo: n.titulo,
            conteudo: n.conteudo,
            cor: n.cor,
            corTexto: n.corTexto,
            tamanhoTexto: n.tamanhoTexto,
          }))
      );
    }
    fetchNotas();
  }, [user]);

  async function criarNota() {
    if (!titulo && !conteudo || !user) return;
    const novaNota = {
      titulo,
      conteudo,
      cor,
      corTexto,
      tamanhoTexto,
    };
    await criarAnotacao(novaNota, user.uid);
    // Após criar, recarrega as notas do Firestore para garantir consistência
    const notasDb = await listarAnotacoes(user.uid);
    setNotas(
      notasDb
        .filter(n => !!n.id)
        .map(n => ({
          id: n.id!,
          titulo: n.titulo,
          conteudo: n.conteudo,
          cor: n.cor,
          corTexto: n.corTexto,
          tamanhoTexto: n.tamanhoTexto,
        }))
    );
    setTitulo('');
    setConteudo('');
    setCor(cores[0]);
    setCorTexto('#ffffff');
    setTamanhoTexto(18);
    setModalAberto(false);
  }

  // Função para verificar se cor é clara
  function isCorClara(hex: string) {
    // Remove o # se existir
    hex = hex.replace('#', '');
    // Converte para RGB
    const r = parseInt(hex.substring(0,2), 16);
    const g = parseInt(hex.substring(2,4), 16);
    const b = parseInt(hex.substring(4,6), 16);
    // Calcula luminância
    const luminancia = (0.299*r + 0.587*g + 0.114*b) / 255;
    return luminancia > 0.7;
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Minhas Anotações</h1>
            <p className="text-muted-foreground">
              Gerencie suas anotações
            </p>
          </div>
      
       
       
        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogTrigger asChild>
            <Button onClick={() => setModalAberto(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova anotação
              </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl" aria-describedby="descricao-anotacao">
            <DialogHeader>
              <DialogTitle>Criar anotação</DialogTitle>
            </DialogHeader>
            <p id="descricao-anotacao" className="sr-only">Preencha os campos para criar uma nova anotação.</p>
            <input
              className="w-full mb-2 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-100 border border-gray-300 dark:border-zinc-700 text-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Título"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
            />
            {/* Grupo: Cor de fundo */}
            <div className="flex flex-col md:flex-row gap-2 items-center mb-2">
              <span className="text-sm dark:text-zinc-100 mr-2">Cor de fundo:</span>
              <div className="flex gap-2 items-center">
                {cores.map(c => (
                  <button
                    key={c}
                    style={{ background: c }}
                    className={`w-8 h-8 rounded-full border-2 ${cor === c ? 'border-primary' : 'border-transparent'} transition-all duration-150`}
                    onClick={() => {
                      setCor(c);
                      setCorTexto(isCorClara(c) ? '#222' : '#fff');
                    }}
                  />
                ))}
                                <input
                  type="color"
                  value={cor}
                  onChange={e => {
                    setCor(e.target.value);
                    setCorTexto(isCorClara(e.target.value) ? '#222' : '#fff');
                  }}
                  className={`
                        w-8 h-8 cursor-pointer
                        border-2 transition-all
                        ${cor === cores.find(c => c === cor)
                          ? "border-transparent"
                          : "border-primary"}
                        color-circle
                      `}
                       style={{
                                    background: 'conic-gradient(red, orange, yellow, green, cyan, blue, violet, red)',
                                   
                                  }}
                  title="Escolher cor personalizada"
                />
              </div>
            </div>
            {/* Grupo: Texto */}
            <div className="flex flex-col md:flex-row gap-2 items-center mb-2">
              <span className="text-sm dark:text-zinc-100 mr-2">Texto:</span>
              <input
                type="color"
                value={corTexto}
                onChange={e => setCorTexto(e.target.value)}
                className="w-8 h-8 rounded-full border-2 border-zinc-300 dark:border-zinc-700 p-0 cursor-pointer bg-transparent color-circle"
                title="Escolher cor da letra"
              />
              <span className="ml-2 text-sm dark:text-zinc-100">Tamanho:</span>
              <input
                type="number"
                min={12}
                max={40}
                value={tamanhoTexto}
                onChange={e => setTamanhoTexto(Number(e.target.value))}
                className="w-16 p-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                style={{ width: 60 }}
              />
            </div>
            <RichTextEditor value={conteudo} onChange={setConteudo} corFundo={cor} corTexto={corTexto} tamanhoTexto={tamanhoTexto} />
            <button
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-bold text-lg w-full mt-auto"
              onClick={criarNota}
            >Salvar</button>
          </DialogContent>
        </Dialog>   
        </div>

        {/* Lista de notas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {notas.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground">Nenhuma anotação encontrada.</div>
          )}
          {notas.map((nota) => (
            <button
              key={nota.id}
              className="rounded-xl shadow-md p-4 flex flex-col text-left cursor-pointer hover:ring-2 hover:ring-primary/60 transition-all"
              style={{ background: nota.cor, color: nota.corTexto, fontSize: nota.tamanhoTexto, maxHeight: 180, minHeight: 120, overflow: 'hidden' }}
              onClick={() => {
                setAnotacaoAberta(nota);
                setEditando(false);
              }}
            >
              <div className="font-bold text-lg mb-2" style={{ color: nota.corTexto, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nota.titulo}</div>
              <div
                className="flex-1 prose prose-zinc dark:prose-invert max-w-none"
                style={{ color: nota.corTexto, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}
                dangerouslySetInnerHTML={{ __html: nota.conteudo }}
              />
            </button>
          ))}
        </div>

        {/* Modal de visualização/edição da anotação */}
        <Dialog open={!!anotacaoAberta} onOpenChange={open => { if (!open) setAnotacaoAberta(null); }}>
          <DialogContent className="max-w-2xl">
            {anotacaoAberta && !editando && (
              <>
                <DialogHeader>
                  <DialogTitle>{anotacaoAberta.titulo}</DialogTitle>
                </DialogHeader>
                <div
                  className="prose prose-zinc dark:prose-invert max-w-none mb-4"
                  style={{
                    color: anotacaoAberta.corTexto,
                    background: anotacaoAberta.cor,
                    fontSize: anotacaoAberta.tamanhoTexto,
                    borderRadius: 12,
                    padding: 16,
                    maxHeight: '60vh',
                    overflowY: 'auto',
                  }}
                  dangerouslySetInnerHTML={{ __html: anotacaoAberta.conteudo }}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditando(true)}>Editar</Button>
                  <Button variant="destructive" onClick={async () => {
                    if (anotacaoAberta?.id) {
                      await deletarAnotacao(anotacaoAberta.id);
                      setNotas(notas.filter(n => n.id !== anotacaoAberta.id));
                      setAnotacaoAberta(null);
                    }
                  }}>Excluir</Button>
                </div>
              </>
            )}
            {anotacaoAberta && editando && (
              <>
                <DialogHeader>
                  <DialogTitle>Editar anotação</DialogTitle>
                </DialogHeader>
                <input
                  className="w-full mb-2 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-100 border border-gray-300 dark:border-zinc-700 text-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Título"
                  value={anotacaoAberta.titulo}
                  onChange={e => setAnotacaoAberta({ ...anotacaoAberta, titulo: e.target.value })}
                />
                <div className="flex flex-col md:flex-row gap-2 items-center mb-2">
                  <span className="text-sm dark:text-zinc-100 mr-2">Cor de fundo:</span>
                  <div className="flex gap-2 items-center">
                    {cores.map(c => (
                      <button
                        key={c}
                        style={{ background: c }}
                        className={`w-8 h-8 rounded-full border-2 ${anotacaoAberta.cor === c ? 'border-primary' : 'border-transparent'} transition-all duration-150`}
                        onClick={() => setAnotacaoAberta({ ...anotacaoAberta, cor: c })}
                        type="button"
                      />
                    ))}
                    <input
                      type="color"
                      value={anotacaoAberta.cor}
                      onChange={e =>
                        setAnotacaoAberta({ ...anotacaoAberta, cor: e.target.value })
                      }
                      className={`
                        w-8 h-8 cursor-pointer
                        border-2 transition-all
                        ${anotacaoAberta.cor === cores.find(c => c === anotacaoAberta.cor)
                          ? "border-transparent"
                          : "border-primary"}
                        color-circle
                      `}
                     style={{background: 'conic-gradient(red, orange, yellow, green, cyan, blue, violet, red)'}}
                      title="Escolher cor personalizada"
                    />

                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-2 items-center mb-2">
                  <span className="text-sm dark:text-zinc-100 mr-2">Texto:</span>
                  <input
                    type="color"
                    value={anotacaoAberta.corTexto}
                    onChange={e => setAnotacaoAberta({ ...anotacaoAberta, corTexto: e.target.value })}
                    className={`w-8 h-8 rounded-full border-2 border-zinc-300 dark:border-zinc-700 p-0 cursor-pointer bg-transparent color-circle`}
                    title="Escolher cor da letra"
                  />
                  <span className="ml-2 text-sm dark:text-zinc-100">Tamanho:</span>
                  <input
                    type="number"
                    min={12}
                    max={40}
                    value={anotacaoAberta.tamanhoTexto}
                    onChange={e => setAnotacaoAberta({ ...anotacaoAberta, tamanhoTexto: Number(e.target.value) })}
                    className="w-16 p-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                    style={{ width: 60 }}
                  />
                </div>
                <RichTextEditor value={anotacaoAberta.conteudo} onChange={v => setAnotacaoAberta({ ...anotacaoAberta, conteudo: v })} corFundo={anotacaoAberta.cor} corTexto={anotacaoAberta.corTexto} tamanhoTexto={anotacaoAberta.tamanhoTexto} />
                <div className="flex gap-2 justify-end mt-2">
                  <Button variant="outline" onClick={() => setEditando(false)}>Cancelar</Button>
                  <Button onClick={async () => {
                    if (anotacaoAberta?.id) {
                      await atualizarAnotacao(anotacaoAberta.id, {
                        titulo: anotacaoAberta.titulo,
                        conteudo: anotacaoAberta.conteudo,
                        cor: anotacaoAberta.cor,
                        corTexto: anotacaoAberta.corTexto,
                        tamanhoTexto: anotacaoAberta.tamanhoTexto,
                      });
                      // Atualiza lista local
                      setNotas(notas.map(n => n.id === anotacaoAberta.id ? { ...n, ...anotacaoAberta } : n));
                      setEditando(false);
                    }
                  }}>Salvar</Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
        </div>
    </Layout>
  );
}

// Editor de texto rico simples estilo Notion
function RichTextEditor({ value, onChange, corFundo, corTexto, tamanhoTexto }: { value: string; onChange: (v: string) => void; corFundo: string; corTexto: string; tamanhoTexto: number }) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (editorRef.current && value && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  function exec(command: string, value?: string) {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }

  // Permite aplicar cor/tamanho apenas ao texto selecionado
  function applyStyleToSelection(style: 'color' | 'fontSize', value: string) {
    document.execCommand(style === 'color' ? 'foreColor' : 'fontSize', false, value);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 mb-2">
        <button type="button" onClick={() => exec('bold')} className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700">B</button>
        <button type="button" onClick={() => exec('italic')} className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 italic hover:bg-zinc-200 dark:hover:bg-zinc-700">I</button>
        <button type="button" onClick={() => exec('underline')} className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 underline hover:bg-zinc-200 dark:hover:bg-zinc-700">U</button>
      </div>
      <div
        ref={editorRef}
        className="border rounded-xl p-4 min-h-[180px] mb-2 outline-none focus:ring-2 focus:ring-blue-500"
        contentEditable
        suppressContentEditableWarning
        dir="ltr"
        onInput={e => {
          const html = (e.target as HTMLDivElement).innerHTML;
          onChange(html);
        }}
        style={{ fontFamily: 'inherit', fontSize: tamanhoTexto, maxHeight: 260, overflowY: 'auto', direction: 'ltr', background: corFundo, color: corTexto }}
      />
    </div>
  );
}
