import assert from "node:assert/strict";
import { formatDuration } from "../app/format.js";
import { parseQuestions } from "../app/questionParser.js";
import { buildAttemptStats, toCsv } from "../app/stats.js";

const numbered = `
1. Discuss ethics in public administration.
2. Examine federalism in India.
3. Analyse climate change and agriculture.
`;

assert.deepEqual(parseQuestions(numbered), [
  "Discuss ethics in public administration.",
  "Examine federalism in India.",
  "Analyse climate change and agriculture.",
]);

assert.equal(formatDuration(65_000), "01:05");
assert.equal(formatDuration(3_665_000, { includeHours: true }), "01:01:05");

const stats = buildAttemptStats(["A", "B", "C"], [60_000, 120_000, 90_000], 30_000);
assert.equal(stats.questionCount, 3);
assert.equal(stats.totalMs, 270_000);
assert.equal(stats.averageMs, 90_000);
assert.equal(stats.medianMs, 90_000);
assert.equal(stats.fastestIndex, 0);
assert.equal(stats.slowestIndex, 1);
assert.equal(stats.overAverageCount, 1);

const csv = toCsv(stats, formatDuration);
assert.match(csv, /Question Number,Question,Time Taken,Time Taken Seconds/);
assert.match(csv, /Total Active Time,00:04:30/);

console.log("All AnswerPace checks passed.");
