import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply persisted theme before render to avoid flash
const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('circular-theme')) || 'dark';
document.documentElement.classList.add(stored === 'light' ? 'light' : 'dark');

createRoot(document.getElementById("root")!).render(<App />);
