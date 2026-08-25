import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const GITHUB_REPO = "https://github.com/AdityaBorkar/forms";
export const GITHUB_BRANCH = "main";
export const GITHUB_EXAMPLES_PREFIX = `${GITHUB_REPO}/blob/${GITHUB_BRANCH}/examples/src`;
