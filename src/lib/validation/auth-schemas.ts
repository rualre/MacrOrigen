import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Correo inválido").max(254);
export const passwordSchema = z.string().min(8, "Usa al menos 8 caracteres").max(72).regex(/[A-Za-z]/, "Incluye al menos una letra").regex(/[0-9]/, "Incluye al menos un número");
export const registroSchema = z.object({ nombre: z.string().trim().min(2).max(50), email: emailSchema, password: passwordSchema });
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(72) });
