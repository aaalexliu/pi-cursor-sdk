import { RETRYABLE_CURSOR_RUN_FAILURE_PREFIX } from "./cursor-provider-errors.js";

export type CursorReplyVerdict =
	| { kind: "reply" }
	| { kind: "printed_tool_calls"; lineCount: number; firstLine: string };

export type CursorOutputRejectionDisposition = "retry" | "exhausted";

export interface CursorOutputRejection {
	contextFingerprint: string;
}

export const CURSOR_CORRECTION_TEXT = "Your last reply printed tool cards as text. Call the tools instead.";

const PRINTED_TOOL_CALL_LINE = /^\s*Tool call\s*\(/;
const FENCE_LINE = /^\s*```/;

export function classifyCursorReplyText(text: string): CursorReplyVerdict {
	let insideFence = false;
	let lineCount = 0;
	let firstLine: string | undefined;
	for (const line of text.split("\n")) {
		if (FENCE_LINE.test(line)) {
			insideFence = !insideFence;
			continue;
		}
		if (insideFence || !PRINTED_TOOL_CALL_LINE.test(line)) continue;
		lineCount += 1;
		firstLine ??= line.trim();
	}
	return firstLine === undefined ? { kind: "reply" } : { kind: "printed_tool_calls", lineCount, firstLine };
}

export function formatCursorOutputRejectionMessage(
	disposition: CursorOutputRejectionDisposition,
	verdict: Extract<CursorReplyVerdict, { kind: "printed_tool_calls" }>,
): string {
	if (disposition === "exhausted") {
		return "Cursor model printed tool calls as text twice in a row. The Cursor agent was reset; send your message again.";
	}
	const lineLabel = verdict.lineCount === 1 ? "1 line" : `${verdict.lineCount} lines`;
	return `${RETRYABLE_CURSOR_RUN_FAILURE_PREFIX}: model emitted tool calls as text (${lineLabel})`;
}
