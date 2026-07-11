export function parseQuestions(rawText) {
  const text = normalizeText(rawText);
  if (!text) {
    return [];
  }

  const numbered = splitNumberedQuestions(text);
  if (numbered.length > 1) {
    return cleanQuestions(numbered);
  }

  const byParagraph = text.split(/\n{2,}/).filter(Boolean);
  if (byParagraph.length > 1) {
    return cleanQuestions(byParagraph);
  }

  const questionLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && /[?.]$/.test(line));

  if (questionLines.length > 1) {
    return cleanQuestions(questionLines);
  }

  return cleanQuestions([text]);
}

export async function readQuestionFile(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "pdf" || file.type === "application/pdf") {
    const buffer = await file.arrayBuffer();
    const extracted = extractTextFromSimplePdf(buffer);
    const questions = parseQuestions(extracted);

    if (questions.length === 0) {
      throw new Error("This PDF could not be read. Try a plain text file or a text-based PDF.");
    }

    return questions;
  }

  const text = await file.text();
  return parseQuestions(text);
}

export function extractTextFromSimplePdf(buffer) {
  const bytes = new Uint8Array(buffer);
  const decoded = new TextDecoder("latin1").decode(bytes);
  const fragments = [];
  const literalStringPattern = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  const arrayPattern = /\[(.*?)\]\s*TJ/gs;

  for (const match of decoded.matchAll(literalStringPattern)) {
    fragments.push(decodePdfLiteral(match[0].replace(/\)\s*Tj$/, "").slice(1)));
  }

  for (const match of decoded.matchAll(arrayPattern)) {
    const textParts = match[1].match(/\((?:\\.|[^\\)])*\)/g) ?? [];
    for (const part of textParts) {
      fragments.push(decodePdfLiteral(part.slice(1, -1)));
    }
  }

  return fragments.join("\n");
}

function splitNumberedQuestions(text) {
  const lines = text.split("\n");
  const questions = [];
  let current = [];
  const starter = /^\s*(?:q(?:uestion)?\.?\s*)?\d{1,3}[\).:\-]\s+/i;

  for (const line of lines) {
    if (starter.test(line) && current.length > 0) {
      questions.push(current.join(" "));
      current = [line];
    } else {
      current.push(line);
    }
  }

  if (current.length > 0) {
    questions.push(current.join(" "));
  }

  return questions;
}

function cleanQuestions(parts) {
  return parts
    .map((question) =>
      question
        .replace(/^\s*(?:q(?:uestion)?\.?\s*)?\d{1,3}[\).:\-]\s+/i, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

function normalizeText(text) {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .trim();
}

function decodePdfLiteral(value) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\[0-7]{1,3}/g, " ")
    .trim();
}
