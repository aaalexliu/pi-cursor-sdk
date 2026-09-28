import type { Context } from "@earendil-works/pi-ai";
import {
	buildCursorCorrectionPrompt,
	buildCursorIncrementalPrompt,
	buildCursorPrompt,
	computeCursorContextFingerprint,
	shouldBootstrapCursorContext,
	type CursorPrompt,
	type CursorPromptOptions,
} from "./context.js";
import type { SessionCursorAgentSendState } from "./cursor-session-agent.js";
import type { CursorOutputRejection } from "./cursor-reply-rejection.js";

// Long-lived SDK session agents can drift tool-call behavior; recreate the agent after this many successful incremental sends.
export const MAX_COMPLETED_INCREMENTAL_SENDS_BEFORE_REBOOTSTRAP = 20;

export type CursorSessionSendMode = "bootstrap" | "incremental" | "correction";

export type CursorSessionSendReason =
	| "initial"
	| "context_divergence"
	| "incremental_threshold"
	| "process_resume"
	| "incremental"
	| "output_rejection";

export interface CursorSessionSendPlan {
	mode: CursorSessionSendMode;
	resetAgent: boolean;
	reason: CursorSessionSendReason;
}

export function planCursorSessionSend(
	sendState: SessionCursorAgentSendState,
	context: Context,
	outputRejection?: CursorOutputRejection,
): CursorSessionSendPlan {
	// The rejected send already reached the agent without commitSend, so replanning it as bootstrap would replay the user message twice.
	if (outputRejection?.contextFingerprint === computeCursorContextFingerprint(context)) {
		return { mode: "correction", resetAgent: false, reason: "output_rejection" };
	}
	if (!sendState.bootstrapped) {
		return { mode: "bootstrap", resetAgent: false, reason: "initial" };
	}
	if (sendState.incrementalSendCount >= MAX_COMPLETED_INCREMENTAL_SENDS_BEFORE_REBOOTSTRAP) {
		return { mode: "bootstrap", resetAgent: true, reason: "incremental_threshold" };
	}
	if (shouldBootstrapCursorContext(sendState, context)) {
		return { mode: "bootstrap", resetAgent: true, reason: "context_divergence" };
	}
	return { mode: "incremental", resetAgent: false, reason: "incremental" };
}

export function buildCursorSessionSendPrompt(
	context: Context,
	options: CursorPromptOptions,
	plan: CursorSessionSendPlan,
): CursorPrompt {
	switch (plan.mode) {
		case "bootstrap":
			return buildCursorPrompt(context, options);
		case "incremental":
			return buildCursorIncrementalPrompt(context, options);
		case "correction":
			return buildCursorCorrectionPrompt(options);
	}
}
