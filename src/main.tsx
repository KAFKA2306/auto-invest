import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
if (window.location.hash.startsWith("#/")) {
  const newPath = `${base}${window.location.hash.slice(1)}` || "/";
  window.history.replaceState(null, "", newPath);
}

createRoot(document.getElementById("root")!).render(<App />);
