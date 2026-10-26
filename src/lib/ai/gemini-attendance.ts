import 'server-only';

export interface GeminiSessionCandidate {
  id: string;
  session_number: number;
  title: string;
  session_date?: string | null;
}

export interface GeminiStudentCandidate {
  id: string;
  full_name_ar?: string | null;
  full_name_en: string;
  email: string;
  faculty?: string | null;
  academic_year?: number | null;
}

export interface SessionColumnMapping {
  columnName: string;
  matchedSessionId: string | null;
  matchedSessionNumber: number | null;
  sessionTitle: string | null;
  confidence: number; // 0 to 1
  isIgnored?: boolean;
}

export interface StudentRowAttendanceMatch {
  rowNumber: number;
  rawName: string;
  rawEmail?: string | null;
  rawPhone?: string | null;
  matchedStudentId: string | null;
  matchedStudentName: string | null;
  matchedStudentEmail?: string | null;
  matchConfidence: number; // 0 to 1
  matchType: 'exact' | 'high_confidence' | 'needs_review' | 'unmatched';
  matchReason: string;
  attendanceBySessionId: Record<
    string,
    {
      status: 'present' | 'absent' | 'excused';
      rawToken: string;
    }
  >;
}

export interface GeminiAttendanceAnalysisResult {
  success: boolean;
  error?: string;
  modelUsed?: string;
  sheetSummary: {
    totalRows: number;
    nameColumn: string;
    detectedSessionColumns: string[];
    matchedStudentsCount: number;
    needsReviewCount: number;
    unmatchedCount: number;
  };
  sessionMappings: SessionColumnMapping[];
  studentMatches: StudentRowAttendanceMatch[];
}

/**
 * Normalizes Arabic text for resilient comparison:
 * - Unifies alefs (أ, إ, آ -> ا)
 * - Unifies taa marbuta (ة -> ه)
 * - Unifies yaa/alef maqsura (ى -> ي)
 * - Removes tashkeel, tatweel and excessive whitespace
 */
export function normalizeArabicName(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // Tashkeel
    .replace(/\u0640/g, '') // Tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

export function normalizeEnglishName(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Calls Gemini 3.8 Flash to analyze attendance sheet data against system database records.
 */
export async function matchAttendanceSheetWithGemini(params: {
  sheetHeaders: string[];
  sheetRows: Record<string, any>[];
  availableSessions: GeminiSessionCandidate[];
  enrolledStudents: GeminiStudentCandidate[];
  apiKeyOverride?: string;
}): Promise<GeminiAttendanceAnalysisResult> {
  const { sheetHeaders, sheetRows, availableSessions, enrolledStudents, apiKeyOverride } = params;

  const apiKey =
    apiKeyOverride ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    '';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }

  // Pre-filter rows to maximum reasonable batch (e.g. 150 rows) for optimal latency
  const cleanedRows = sheetRows.slice(0, 200).map((row, idx) => {
    const compactRow: Record<string, any> = { _rowIdx: idx + 1 };
    for (const h of sheetHeaders) {
      if (row[h] !== undefined && row[h] !== null && String(row[h]).trim() !== '') {
        compactRow[h] = String(row[h]).trim();
      }
    }
    return compactRow;
  });

  const prompt = `
You are the AI Attendance Analysis Engine for Google Developer Groups on Campus (GDGoC) - Helwan National University.
Your task is to analyze an imported student attendance Excel spreadsheet and reconcile it against the official course session schedule and enrolled students database.

=== SYSTEM REGISTERED SESSIONS (${availableSessions.length} sessions) ===
${JSON.stringify(
  availableSessions.map((s) => ({
    id: s.id,
    session_number: s.session_number,
    title: s.title,
    date: s.session_date || 'N/A',
  })),
  null,
  2
)}

=== SYSTEM REGISTERED STUDENTS (${enrolledStudents.length} students enrolled in this course) ===
${JSON.stringify(
  enrolledStudents.map((u) => ({
    id: u.id,
    name_ar: u.full_name_ar || '',
    name_en: u.full_name_en || '',
    email: u.email || '',
    faculty: u.faculty || '',
  })),
  null,
  2
)}

=== SPREADSHEET HEADERS ===
${JSON.stringify(sheetHeaders)}

=== SPREADSHEET SAMPLE ROWS (${cleanedRows.length} rows) ===
${JSON.stringify(cleanedRows)}

=== RULES & INSTRUCTIONS ===
1. SESSION MAPPING:
   - Identify which columns correspond to session/lecture attendance (e.g. "المحاضرة الأولى", "Session 1", "Week 2", "Lec 3", or dates).
   - Map each session column to the matching session ID from the SYSTEM REGISTERED SESSIONS.
   - If a column is a student name, serial number, ID, or total attendance count, DO NOT map it to a session.

2. BILINGUAL NAME & STUDENT MATCHING:
   - Identify the primary student name column (or email column if present).
   - Match each student in the spreadsheet to a registered student from SYSTEM REGISTERED STUDENTS.
   - Note that names in Egypt can be in Arabic, English, or transliterated (e.g. "احمد سالمان" matches "Ahmed Salman" or "Ahmed Salman Hanmeed Mohammed").
   - Handle variations in spelling, typos, missing 4th names, and Arabic hamzas (أ / ا / إ, ة / ه, ى / ي).
   - Assign matchConfidence (between 0.0 and 1.0):
     * 0.95 - 1.00: "exact" or unambiguous confident match.
     * 0.70 - 0.94: "high_confidence" or minor spelling/parts difference.
     * 0.40 - 0.69: "needs_review" (possible collision, ambiguous first names, or low confidence).
     * < 0.40: "unmatched" (not found in enrollment list).

3. ATTENDANCE STATUS TOKEN NORMALIZATION:
   - For each mapped session column, classify the student's status into one of:
     * "present": if cell contains "حاضر", "حضر", "P", "1", "نعم", "Yes", "Present", "V", "True", "✔", or similar confirmation.
     * "absent": if cell contains "غائب", "غ", "A", "0", "لا", "No", "Absent", "False", "x", or is empty / missing.
     * "excused": if cell contains "معتذر", "بعذر", "عذر", "Excused", "E", "Sick", or similar permission.

Return your response strictly as valid JSON adhering to this exact JSON schema:
{
  "sessionMappings": [
    {
      "columnName": string,
      "matchedSessionId": string | null,
      "matchedSessionNumber": number | null,
      "sessionTitle": string | null,
      "confidence": number
    }
  ],
  "studentMatches": [
    {
      "rowNumber": number,
      "rawName": string,
      "rawEmail": string | null,
      "matchedStudentId": string | null,
      "matchedStudentName": string | null,
      "matchedStudentEmail": string | null,
      "matchConfidence": number,
      "matchType": "exact" | "high_confidence" | "needs_review" | "unmatched",
      "matchReason": string,
      "attendanceBySessionId": {
        [sessionId: string]: {
          "status": "present" | "absent" | "excused",
          "rawToken": string
        }
      }
    }
  ],
  "sheetSummary": {
    "totalRows": number,
    "nameColumn": string,
    "detectedSessionColumns": string[],
    "matchedStudentsCount": number,
    "needsReviewCount": number,
    "unmatchedCount": number
  }
}
`;

  // Candidate models in priority order
  const modelCandidates = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-flash'];

  let lastError: any = null;

  for (const model of modelCandidates) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1, // High determinism for data reconciliation
            },
          }),
        }
      );

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        console.warn(`[GeminiAttendance] Model ${model} returned error:`, errJson);
        lastError = errJson;
        continue;
      }

      const resJson = await response.json();
      const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Gemini returned an empty response.');
      }

      const parsedData = JSON.parse(rawText);

      return {
        success: true,
        modelUsed: model,
        sheetSummary: parsedData.sheetSummary || {
          totalRows: cleanedRows.length,
          nameColumn: 'Name',
          detectedSessionColumns: [],
          matchedStudentsCount: (parsedData.studentMatches || []).filter((s: any) => s.matchedStudentId).length,
          needsReviewCount: (parsedData.studentMatches || []).filter((s: any) => s.matchType === 'needs_review').length,
          unmatchedCount: (parsedData.studentMatches || []).filter((s: any) => !s.matchedStudentId).length,
        },
        sessionMappings: parsedData.sessionMappings || [],
        studentMatches: parsedData.studentMatches || [],
      };
    } catch (err: any) {
      console.warn(`[GeminiAttendance] Failed with model ${model}:`, err.message);
      lastError = err;
    }
  }

  // If external API failed or timed out, provide local deterministic fallback
  console.warn('[GeminiAttendance] Falling back to local heuristic matching engine...');
  return localHeuristicAttendanceMatcher({
    sheetHeaders,
    sheetRows: cleanedRows,
    availableSessions,
    enrolledStudents,
  });
}

/**
 * Robust local fallback engine in case Gemini API is unreachable:
 * Performs Arabic & English fuzzy matching + token normalization.
 */
function localHeuristicAttendanceMatcher(params: {
  sheetHeaders: string[];
  sheetRows: Record<string, any>[];
  availableSessions: GeminiSessionCandidate[];
  enrolledStudents: GeminiStudentCandidate[];
}): GeminiAttendanceAnalysisResult {
  const { sheetHeaders, sheetRows, availableSessions, enrolledStudents } = params;

  // 1. Identify Name Column
  let nameCol = sheetHeaders.find((h) =>
    /اسم|الاسم|طالب|name|student/i.test(h)
  ) || sheetHeaders[0] || 'Name';

  // 2. Identify Session Columns
  const sessionMappings: SessionColumnMapping[] = [];
  const detectedSessionCols: string[] = [];

  for (const h of sheetHeaders) {
    if (h === nameCol) continue;
    const sessionMatch = h.match(/(?:محاضرة|سيشن|session|lec|lecture|week|w)\s*([0-9]+)/i);
    if (sessionMatch) {
      const sessNum = parseInt(sessionMatch[1], 10);
      const targetSess = availableSessions.find((s) => s.session_number === sessNum);
      if (targetSess) {
        sessionMappings.push({
          columnName: h,
          matchedSessionId: targetSess.id,
          matchedSessionNumber: targetSess.session_number,
          sessionTitle: targetSess.title,
          confidence: 0.95,
        });
        detectedSessionCols.push(h);
      }
    }
  }

  // 3. Match Rows
  const studentMatches: StudentRowAttendanceMatch[] = [];
  let matchedCount = 0;
  let needsReviewCount = 0;
  let unmatchedCount = 0;

  sheetRows.forEach((row, idx) => {
    const rawName = String(row[nameCol] || '').trim();
    if (!rawName) return;

    const normRawAr = normalizeArabicName(rawName);
    const normRawEn = normalizeEnglishName(rawName);

    let bestMatch: GeminiStudentCandidate | null = null;
    let bestScore = 0;
    let matchReason = '';

    for (const student of enrolledStudents) {
      const studentNormAr = normalizeArabicName(student.full_name_ar || '');
      const studentNormEn = normalizeEnglishName(student.full_name_en || '');

      // Exact Arabic match
      if (studentNormAr && normRawAr && (studentNormAr === normRawAr || studentNormAr.includes(normRawAr) || normRawAr.includes(studentNormAr))) {
        const score = studentNormAr === normRawAr ? 1.0 : 0.9;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = student;
          matchReason = score === 1.0 ? 'Exact Arabic Name Match' : 'Partial Arabic Match';
        }
      }

      // Exact English match
      if (studentNormEn && normRawEn && (studentNormEn === normRawEn || studentNormEn.includes(normRawEn) || normRawEn.includes(studentNormEn))) {
        const score = studentNormEn === normRawEn ? 1.0 : 0.88;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = student;
          matchReason = score === 1.0 ? 'Exact English Name Match' : 'Partial English Match';
        }
      }
    }

    const attendanceBySessionId: StudentRowAttendanceMatch['attendanceBySessionId'] = {};

    for (const sm of sessionMappings) {
      if (!sm.matchedSessionId) continue;
      const rawVal = String(row[sm.columnName] || '').trim();
      let status: 'present' | 'absent' | 'excused' = 'absent';

      if (/حاضر|حضر|p|1|yes|نعم|v|true|✔/i.test(rawVal)) {
        status = 'present';
      } else if (/معتذر|بعذر|عذر|excused|e/i.test(rawVal)) {
        status = 'excused';
      }

      attendanceBySessionId[sm.matchedSessionId] = {
        status,
        rawToken: rawVal,
      };
    }

    let matchType: StudentRowAttendanceMatch['matchType'] = 'unmatched';
    if (bestScore >= 0.95) {
      matchType = 'exact';
      matchedCount++;
    } else if (bestScore >= 0.75) {
      matchType = 'high_confidence';
      matchedCount++;
    } else if (bestScore >= 0.4) {
      matchType = 'needs_review';
      needsReviewCount++;
    } else {
      unmatchedCount++;
    }

    studentMatches.push({
      rowNumber: idx + 1,
      rawName,
      matchedStudentId: bestMatch ? bestMatch.id : null,
      matchedStudentName: bestMatch
        ? `${bestMatch.full_name_en} (${bestMatch.full_name_ar || ''})`
        : null,
      matchedStudentEmail: bestMatch?.email || null,
      matchConfidence: bestScore,
      matchType,
      matchReason: matchReason || 'Unmatched student record',
      attendanceBySessionId,
    });
  });

  return {
    success: true,
    modelUsed: 'local-heuristic-engine',
    sheetSummary: {
      totalRows: sheetRows.length,
      nameColumn: nameCol,
      detectedSessionColumns: detectedSessionCols,
      matchedStudentsCount: matchedCount,
      needsReviewCount,
      unmatchedCount,
    },
    sessionMappings,
    studentMatches,
  };
}
