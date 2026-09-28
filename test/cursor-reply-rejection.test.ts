import { describe, expect, it } from "vitest";
import { isRetryableAssistantError } from "@earendil-works/pi-ai/utils/retry";
import {
	classifyCursorReplyText,
	formatCursorOutputRejectionMessage,
	type CursorOutputRejectionDisposition,
} from "../src/cursor-reply-rejection.js";
import { makeAssistantMessage } from "./helpers/pi-harness.js";

describe("classifyCursorReplyText", () => {
	it.each([
		{
			name: "plain card",
			text: "Tool call(Write, path=a)",
			expected: { kind: "printed_tool_calls", lineCount: 1, firstLine: "Tool call(Write, path=a)" },
		},
		{
			name: "space before the paren",
			text: "Let me write it.\n  Tool call (Write)\n",
			expected: { kind: "printed_tool_calls", lineCount: 1, firstLine: "Tool call (Write)" },
		},
		{
			name: "replay label form",
			text: "Tool call (write, call id): {}\nTool call (read, call id2): {}",
			expected: { kind: "printed_tool_calls", lineCount: 2, firstLine: "Tool call (write, call id): {}" },
		},
		{
			name: "cards inside a fence",
			text: "Example:\n```\nTool call(Write, path=a)\nTool call (write, call id): {}\n```",
			expected: { kind: "reply" },
		},
		{
			name: "prose with no cards",
			text: "The tool call (Write) failed earlier, so I retried it.",
			expected: { kind: "reply" },
		},
		{
			name: "mixed fenced and unfenced",
			text: "```ts\nTool call(Read)\n```\nTool call(Write, path=b)\n```\nTool call(Edit)\n```\nTool call (Shell)",
			expected: { kind: "printed_tool_calls", lineCount: 2, firstLine: "Tool call(Write, path=b)" },
		},
	])("classifies $name", ({ text, expected }) => {
		expect(classifyCursorReplyText(text)).toEqual(expected);
	});
});

describe("formatCursorOutputRejectionMessage", () => {
	function isRetryable(disposition: CursorOutputRejectionDisposition, firstLine: string): boolean {
		const message = makeAssistantMessage("");
		message.stopReason = "error";
		message.errorMessage = formatCursorOutputRejectionMessage(disposition, {
			kind: "printed_tool_calls",
			lineCount: 3,
			firstLine,
		});
		return isRetryableAssistantError(message);
	}

	it("makes the retry message retryable and the exhausted message terminal for pi", () => {
		expect(isRetryable("retry", "Tool call(Write, path=billing.ts)")).toBe(true);
		expect(isRetryable("exhausted", "Tool call(Write, path=a)")).toBe(false);
	});

	it("formats both dispositions without copying model text into the retryable error", () => {
		const verdict = { kind: "printed_tool_calls" as const, lineCount: 3, firstLine: "Tool call(Write, path=billing.ts)" };

		expect(formatCursorOutputRejectionMessage("retry", verdict)).toBe(
			"Provider returned error: Cursor SDK run failed: model emitted tool calls as text (3 lines)",
		);
		expect(formatCursorOutputRejectionMessage("exhausted", verdict)).toBe(
			"Cursor model printed tool calls as text twice in a row. The Cursor agent was reset; send your message again.",
		);
		expect(formatCursorOutputRejectionMessage("retry", { ...verdict, lineCount: 1 })).toBe(
			"Provider returned error: Cursor SDK run failed: model emitted tool calls as text (1 line)",
		);
	});
});
