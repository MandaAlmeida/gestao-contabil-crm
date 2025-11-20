# Client Sync Forge

## Configuração do Firebase

1. Crie um arquivo `.env` na raiz do projeto e adicione as variáveis abaixo:

   ```bash
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   VITE_FIREBASE_MEASUREMENT_ID=
   VITE_USE_FIREBASE_EMULATORS=false
   VITE_FIREBASE_EMULATOR_HOST=127.0.0.1
   ```

2. Preencha as variáveis `VITE_FIREBASE_*` com as chaves fornecidas pelo console do Firebase.
3. (Opcional) Ajuste `VITE_USE_FIREBASE_EMULATORS` para `true` durante o desenvolvimento com emuladores locais e configure o host em `VITE_FIREBASE_EMULATOR_HOST`.

> **Nota:** a inicialização do Firebase está preparada em `src/lib/firebase.ts`, mas não é carregada automaticamente. Quando quiser habilitar, importe a função/configuração no ponto desejado da aplicação.

## Como executar o projeto localmente

Para trabalhar localmente, você precisa ter Node.js & npm instalados - [instale com nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Siga estes passos:

```sh
# Passo 1: Clone o repositório
git clone <YOUR_GIT_URL>

# Passo 2: Navegue até o diretório do projeto
cd <YOUR_PROJECT_NAME>

# Passo 3: Instale as dependências necessárias
npm i

# Passo 4: Inicie o servidor de desenvolvimento
npm run dev
```

## Tecnologias utilizadas

Este projeto é construído com:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Firebase

## Como fazer deploy

Para fazer o build de produção:

```sh
npm run build
```

Os arquivos serão gerados na pasta `dist/` e podem ser implantados em qualquer serviço de hospedagem estática.
