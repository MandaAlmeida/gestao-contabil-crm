import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { carregarDadosExemplo } from "./lib/dadosExemplo";

// Ambiente de teste: grava os dados de exemplo antes de renderizar
carregarDadosExemplo().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
