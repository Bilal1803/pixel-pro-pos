import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initErrorLogger } from "./lib/errorLogger";

initErrorLogger();

createRoot(document.getElementById("root")!).render(<App />);
