"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";

export function ThemeToggle() {
  const [oscuro, setOscuro] = useState(false);
  useEffect(() => {
    const inicial = localStorage.getItem("macrorigen-theme") === "dark" || (!localStorage.getItem("macrorigen-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setOscuro(inicial); document.documentElement.classList.toggle("dark", inicial);
  }, []);
  function alternar() {
    const nuevo = !oscuro; setOscuro(nuevo); document.documentElement.classList.toggle("dark", nuevo); localStorage.setItem("macrorigen-theme", nuevo ? "dark" : "light");
  }
  return <Button variant="ghost" size="icon" onClick={alternar} aria-label={oscuro ? "Activar modo claro" : "Activar modo oscuro"}>{oscuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>;
}
