// Banco de dados local (localStorage) com a mesma API do Firestore usada no projeto.
// Substitui o Firebase no ambiente de teste: os dados ficam apenas neste navegador.

type DocData = Record<string, any>;
type CollectionStore = Record<string, DocData>;

const STORAGE_PREFIX = "crm-local:";

export type Firestore = { readonly type: "local" };

export const localDb: Firestore = { type: "local" };

// ---------------------------------------------------------------------------
// Persistência
// ---------------------------------------------------------------------------

// Fallback em memória caso o localStorage esteja indisponível (aba anônima, bloqueado etc.)
const memoryStore = new Map<string, CollectionStore>();

function lerColecao(path: string): CollectionStore {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + path);
    return raw ? (JSON.parse(raw) as CollectionStore) : {};
  } catch {
    return memoryStore.get(path) ?? {};
  }
}

function gravarColecao(path: string, store: CollectionStore) {
  memoryStore.set(path, store);
  try {
    localStorage.setItem(STORAGE_PREFIX + path, JSON.stringify(store));
  } catch (error) {
    console.warn("[localDb] Não foi possível salvar no localStorage:", error);
  }
  notificarListeners(path);
}

// Remove todos os dados locais do sistema
export function limparDadosLocais() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(STORAGE_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignora
  }
  const paths = [...memoryStore.keys()];
  memoryStore.clear();
  paths.forEach(notificarListeners);
}

function gerarId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 20; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// ---------------------------------------------------------------------------
// Valores especiais
// ---------------------------------------------------------------------------

export class Timestamp {
  constructor(public readonly seconds: number, public readonly nanoseconds: number) {}

  static now() {
    return Timestamp.fromMillis(Date.now());
  }

  static fromDate(date: Date) {
    return Timestamp.fromMillis(date.getTime());
  }

  static fromMillis(ms: number) {
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6);
  }

  toDate() {
    return new Date(this.toMillis());
  }

  toMillis() {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6);
  }

  // Salvo no localStorage como data ISO
  toJSON() {
    return this.toDate().toISOString();
  }
}

class DeleteFieldSentinel {}

export function deleteField(): any {
  return new DeleteFieldSentinel();
}

export function serverTimestamp(): any {
  return new Date().toISOString();
}

// Converte para JSON puro (Date/Timestamp viram string ISO, undefined é descartado)
function serializar(data: DocData): DocData {
  return JSON.parse(JSON.stringify(data));
}

function lerCampo(data: DocData, fieldPath: string): any {
  return fieldPath.split(".").reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), data);
}

function aplicarCampos(target: DocData, updates: DocData) {
  for (const [fieldPath, value] of Object.entries(updates)) {
    const keys = fieldPath.split(".");
    const last = keys.pop()!;
    let obj = target;
    for (const key of keys) {
      if (typeof obj[key] !== "object" || obj[key] === null) obj[key] = {};
      obj = obj[key];
    }
    if (value instanceof DeleteFieldSentinel) {
      delete obj[last];
    } else if (value !== undefined) {
      obj[last] = value;
    }
  }
}

function removerSentinelas(data: DocData): DocData {
  const limpo: DocData = {};
  aplicarCampos(limpo, data);
  return limpo;
}

// ---------------------------------------------------------------------------
// Referências
// ---------------------------------------------------------------------------

export class CollectionReference {
  readonly type = "collection";
  constructor(public readonly path: string) {}

  get id() {
    return this.path.split("/").pop()!;
  }
}

export class DocumentReference {
  readonly type = "document";
  constructor(public readonly collectionPath: string, public readonly id: string) {}

  get path() {
    return `${this.collectionPath}/${this.id}`;
  }

  get parent() {
    return new CollectionReference(this.collectionPath);
  }
}

type Parent = Firestore | CollectionReference | DocumentReference;

function segmentosDe(parent: Parent, segments: string[]): string[] {
  const base = parent instanceof CollectionReference || parent instanceof DocumentReference ? [parent.path] : [];
  return [...base, ...segments].flatMap((s) => s.split("/")).filter(Boolean);
}

export function collection(parent: Parent, ...pathSegments: string[]): CollectionReference {
  return new CollectionReference(segmentosDe(parent, pathSegments).join("/"));
}

export function doc(parent: Parent, ...pathSegments: string[]): DocumentReference {
  const segmentos = segmentosDe(parent, pathSegments);
  // Número ímpar de segmentos = caminho de coleção, gera ID automático
  if (segmentos.length % 2 === 1) {
    return new DocumentReference(segmentos.join("/"), gerarId());
  }
  const id = segmentos.pop()!;
  return new DocumentReference(segmentos.join("/"), id);
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

type WhereFilterOp =
  | "=="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "in"
  | "not-in"
  | "array-contains"
  | "array-contains-any";

type FieldFilter = { kind: "where"; field: string; op: WhereFilterOp; value: any };
type CompositeFilter = { kind: "or" | "and"; filters: Filter[] };
type Filter = FieldFilter | CompositeFilter;
type OrderConstraint = { kind: "orderBy"; field: string; direction: "asc" | "desc" };
type LimitConstraint = { kind: "limit"; count: number };
type QueryConstraint = Filter | OrderConstraint | LimitConstraint;

export class Query {
  readonly type = "query";
  constructor(public readonly collectionPath: string, public readonly constraints: QueryConstraint[]) {}
}

export function where(field: string, op: WhereFilterOp, value: any): FieldFilter {
  return { kind: "where", field, op, value };
}

export function or(...filters: Filter[]): CompositeFilter {
  return { kind: "or", filters };
}

export function and(...filters: Filter[]): CompositeFilter {
  return { kind: "and", filters };
}

export function orderBy(field: string, direction: "asc" | "desc" = "asc"): OrderConstraint {
  return { kind: "orderBy", field, direction };
}

export function limit(count: number): LimitConstraint {
  return { kind: "limit", count };
}

export function query(base: CollectionReference | Query, ...constraints: QueryConstraint[]): Query {
  if (base instanceof Query) {
    return new Query(base.collectionPath, [...base.constraints, ...constraints]);
  }
  return new Query(base.path, constraints);
}

function iguais(a: any, b: any) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function comparar(a: any, b: any): number {
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

function atendeFiltro(data: DocData, f: Filter): boolean {
  if (f.kind === "or") return (f as CompositeFilter).filters.some((sub) => atendeFiltro(data, sub));
  if (f.kind === "and") return (f as CompositeFilter).filters.every((sub) => atendeFiltro(data, sub));

  const filtro = f as FieldFilter;
  const valor = lerCampo(data, filtro.field);
  const alvo = filtro.value;

  switch (filtro.op) {
    case "==":
      return valor !== undefined && iguais(valor, alvo);
    case "!=":
      return valor !== undefined && !iguais(valor, alvo);
    case "<":
      return valor !== undefined && comparar(valor, alvo) < 0;
    case "<=":
      return valor !== undefined && comparar(valor, alvo) <= 0;
    case ">":
      return valor !== undefined && comparar(valor, alvo) > 0;
    case ">=":
      return valor !== undefined && comparar(valor, alvo) >= 0;
    case "in":
      return Array.isArray(alvo) && alvo.some((v) => iguais(valor, v));
    case "not-in":
      return valor !== undefined && Array.isArray(alvo) && !alvo.some((v) => iguais(valor, v));
    case "array-contains":
      return Array.isArray(valor) && valor.some((v) => iguais(v, alvo));
    case "array-contains-any":
      return Array.isArray(valor) && Array.isArray(alvo) && valor.some((v) => alvo.some((a) => iguais(v, a)));
  }
}

function executarConsulta(alvo: CollectionReference | Query): QueryDocumentSnapshot[] {
  const path = alvo instanceof Query ? alvo.collectionPath : alvo.path;
  const constraints = alvo instanceof Query ? alvo.constraints : [];

  let entradas = Object.entries(lerColecao(path));

  for (const c of constraints) {
    if (c.kind === "where" || c.kind === "or" || c.kind === "and") {
      entradas = entradas.filter(([, data]) => atendeFiltro(data, c));
    }
  }

  const ordenacoes = constraints.filter((c): c is OrderConstraint => c.kind === "orderBy");
  if (ordenacoes.length > 0) {
    // Assim como no Firestore, documentos sem o campo ordenado ficam de fora
    entradas = entradas.filter(([, data]) => ordenacoes.every((o) => lerCampo(data, o.field) !== undefined));
    entradas.sort(([, a], [, b]) => {
      for (const o of ordenacoes) {
        const r = comparar(lerCampo(a, o.field), lerCampo(b, o.field));
        if (r !== 0) return o.direction === "desc" ? -r : r;
      }
      return 0;
    });
  }

  const limite = constraints.find((c): c is LimitConstraint => c.kind === "limit");
  if (limite) entradas = entradas.slice(0, limite.count);

  return entradas.map(([id, data]) => new QueryDocumentSnapshot(new DocumentReference(path, id), data));
}

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

export class DocumentSnapshot {
  constructor(public readonly ref: DocumentReference, private readonly _data: DocData | undefined) {}

  get id() {
    return this.ref.id;
  }

  exists(): boolean {
    return this._data !== undefined;
  }

  data(): any {
    return this._data === undefined ? undefined : serializar(this._data);
  }

  get(field: string): any {
    return this._data === undefined ? undefined : lerCampo(this._data, field);
  }
}

export class QueryDocumentSnapshot extends DocumentSnapshot {
  data(): any {
    return super.data();
  }
}

export class QuerySnapshot {
  constructor(public readonly docs: QueryDocumentSnapshot[]) {}

  get size() {
    return this.docs.length;
  }

  get empty() {
    return this.docs.length === 0;
  }

  forEach(callback: (doc: QueryDocumentSnapshot) => void) {
    this.docs.forEach(callback);
  }
}

// ---------------------------------------------------------------------------
// Leitura e escrita
// ---------------------------------------------------------------------------

export async function getDoc(ref: DocumentReference): Promise<DocumentSnapshot> {
  return new DocumentSnapshot(ref, lerColecao(ref.collectionPath)[ref.id]);
}

export async function getDocs(alvo: CollectionReference | Query): Promise<QuerySnapshot> {
  return new QuerySnapshot(executarConsulta(alvo));
}

function setDocSync(ref: DocumentReference, data: DocData, options?: { merge?: boolean }) {
  const store = lerColecao(ref.collectionPath);
  if (options?.merge && store[ref.id]) {
    const atual = { ...store[ref.id] };
    aplicarCampos(atual, data);
    store[ref.id] = serializar(atual);
  } else {
    store[ref.id] = serializar(removerSentinelas(data));
  }
  gravarColecao(ref.collectionPath, store);
}

function updateDocSync(ref: DocumentReference, data: DocData) {
  const store = lerColecao(ref.collectionPath);
  if (!store[ref.id]) {
    throw Object.assign(new Error(`Documento não encontrado: ${ref.path}`), { code: "not-found" });
  }
  const atual = { ...store[ref.id] };
  aplicarCampos(atual, data);
  store[ref.id] = serializar(atual);
  gravarColecao(ref.collectionPath, store);
}

function deleteDocSync(ref: DocumentReference) {
  const store = lerColecao(ref.collectionPath);
  if (!(ref.id in store)) return;
  delete store[ref.id];
  gravarColecao(ref.collectionPath, store);
}

export async function setDoc(ref: DocumentReference, data: DocData, options?: { merge?: boolean }): Promise<void> {
  setDocSync(ref, data, options);
}

export async function addDoc(colRef: CollectionReference, data: DocData): Promise<DocumentReference> {
  const ref = new DocumentReference(colRef.path, gerarId());
  setDocSync(ref, data);
  return ref;
}

export async function updateDoc(ref: DocumentReference, data: DocData): Promise<void> {
  updateDocSync(ref, data);
}

export async function deleteDoc(ref: DocumentReference): Promise<void> {
  deleteDocSync(ref);
}

export function writeBatch(_db: Firestore) {
  const operacoes: Array<() => void> = [];
  const batch = {
    set(ref: DocumentReference, data: DocData, options?: { merge?: boolean }) {
      operacoes.push(() => setDocSync(ref, data, options));
      return batch;
    },
    update(ref: DocumentReference, data: DocData) {
      operacoes.push(() => updateDocSync(ref, data));
      return batch;
    },
    delete(ref: DocumentReference) {
      operacoes.push(() => deleteDocSync(ref));
      return batch;
    },
    async commit() {
      operacoes.forEach((op) => op());
    },
  };
  return batch;
}

// ---------------------------------------------------------------------------
// Tempo real (onSnapshot)
// ---------------------------------------------------------------------------

const listeners = new Map<string, Set<() => void>>();

function notificarListeners(path: string) {
  listeners.get(path)?.forEach((fn) => fn());
}

// Sincroniza alterações feitas em outras abas
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key?.startsWith(STORAGE_PREFIX)) {
      const path = event.key.slice(STORAGE_PREFIX.length);
      memoryStore.delete(path);
      notificarListeners(path);
    }
  });
}

export function onSnapshot(
  alvo: CollectionReference | Query | DocumentReference,
  onNext: (snapshot: any) => void,
  onError?: (error: Error) => void
): () => void {
  const path = alvo instanceof DocumentReference ? alvo.collectionPath : alvo instanceof Query ? alvo.collectionPath : alvo.path;

  let ativo = true;
  const emitir = () => {
    if (!ativo) return;
    try {
      if (alvo instanceof DocumentReference) {
        onNext(new DocumentSnapshot(alvo, lerColecao(path)[alvo.id]));
      } else {
        onNext(new QuerySnapshot(executarConsulta(alvo)));
      }
    } catch (error) {
      onError?.(error as Error);
    }
  };

  if (!listeners.has(path)) listeners.set(path, new Set());
  listeners.get(path)!.add(emitir);
  queueMicrotask(emitir);

  return () => {
    ativo = false;
    listeners.get(path)?.delete(emitir);
  };
}
