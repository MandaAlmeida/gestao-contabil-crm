# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/b821792c-1d9d-4773-8b18-275681b79271

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

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/b821792c-1d9d-4773-8b18-275681b79271) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/b821792c-1d9d-4773-8b18-275681b79271) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
