export function buildAttemptStats(questions, timesMs, pauseMs = 0) {
  const questionCount = questions.length;
  const totalMs = timesMs.reduce((sum, value) => sum + value, 0);
  const averageMs = questionCount > 0 ? totalMs / questionCount : 0;
  const fastestIndex = findExtremeIndex(timesMs, "min");
  const slowestIndex = findExtremeIndex(timesMs, "max");
  const medianMs = getMedian(timesMs);
  const overAverageCount = timesMs.filter((time) => time > averageMs).length;

  return {
    questionCount,
    totalMs,
    averageMs,
    medianMs,
    fastestIndex,
    slowestIndex,
    pauseMs,
    overAverageCount,
    rows: questions.map((question, index) => ({
      index,
      question,
      timeMs: timesMs[index] ?? 0,
    })),
  };
}

export function toCsv(stats, formatDuration) {
  const rows = [
    ["Question Number", "Question", "Time Taken", "Time Taken Seconds"],
    ...stats.rows.map((row) => [
      String(row.index + 1),
      row.question,
      formatDuration(row.timeMs, { includeHours: true }),
      String(Math.round(row.timeMs / 1000)),
    ]),
    [],
    ["Summary", "Value", "", ""],
    ["Total Questions", String(stats.questionCount), "", ""],
    ["Total Active Time", formatDuration(stats.totalMs, { includeHours: true }), "", ""],
    ["Average Time Per Question", formatDuration(stats.averageMs, { includeHours: true }), "", ""],
    ["Median Time Per Question", formatDuration(stats.medianMs, { includeHours: true }), "", ""],
    [
      "Fastest Question",
      stats.fastestIndex >= 0 ? `Question ${stats.fastestIndex + 1}` : "N/A",
      stats.fastestIndex >= 0 ? formatDuration(stats.rows[stats.fastestIndex].timeMs, { includeHours: true }) : "",
      "",
    ],
    [
      "Slowest Question",
      stats.slowestIndex >= 0 ? `Question ${stats.slowestIndex + 1}` : "N/A",
      stats.slowestIndex >= 0 ? formatDuration(stats.rows[stats.slowestIndex].timeMs, { includeHours: true }) : "",
      "",
    ],
    ["Questions Above Average Time", String(stats.overAverageCount), "", ""],
    ["Pause Duration", formatDuration(stats.pauseMs, { includeHours: true }), "", ""],
  ];

  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

function findExtremeIndex(values, mode) {
  if (values.length === 0) {
    return -1;
  }

  let selectedIndex = 0;
  for (let index = 1; index < values.length; index += 1) {
    const shouldReplace = mode === "min" ? values[index] < values[selectedIndex] : values[index] > values[selectedIndex];
    if (shouldReplace) {
      selectedIndex = index;
    }
  }

  return selectedIndex;
}

function getMedian(values) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
