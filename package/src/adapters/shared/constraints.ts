import type { FieldCheck } from "@/types";

export type ConstraintAcc = {
	min?: number;
	max?: number;
	checks: FieldCheck[];
};

export function createConstraintAcc(): ConstraintAcc {
	return { checks: [] };
}

export function finalizeConstraints(acc: ConstraintAcc): {
	checks?: FieldCheck[];
	max?: number;
	min?: number;
} {
	return {
		checks: acc.checks.length ? acc.checks : undefined,
		max: acc.max,
		min: acc.min,
	};
}
