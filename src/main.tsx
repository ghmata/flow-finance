import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/test-db"; // Teste DB


createRoot(document.getElementById("root")!).render(<App />);
