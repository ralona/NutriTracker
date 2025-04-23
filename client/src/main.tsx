import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add custom styles for application theme based on design reference
document.documentElement.style.setProperty('--primary', '121 37% 46%'); // Green from design
document.documentElement.style.setProperty('--primary-foreground', '0 0% 100%');
document.documentElement.style.setProperty('--secondary', '206 100% 50%'); // Blue from design
document.documentElement.style.setProperty('--secondary-foreground', '0 0% 100%');
document.documentElement.style.setProperty('--accent', '33 100% 50%'); // Orange from design
document.documentElement.style.setProperty('--accent-foreground', '0 0% 100%');
document.documentElement.style.setProperty('--muted', '0 0% 96.1%');
document.documentElement.style.setProperty('--muted-foreground', '0 0% 45.1%');
document.documentElement.style.setProperty('--chart-1', '121 37% 46%'); // Primary green
document.documentElement.style.setProperty('--chart-2', '206 100% 50%'); // Secondary blue
document.documentElement.style.setProperty('--chart-3', '33 100% 50%'); // Accent orange
document.documentElement.style.setProperty('--chart-4', '0 84% 60%'); // Red
document.documentElement.style.setProperty('--chart-5', '262 83% 58%'); // Purple

createRoot(document.getElementById("root")!).render(<App />);
