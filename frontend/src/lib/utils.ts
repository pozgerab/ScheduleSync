import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import "fs";
import "path";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
