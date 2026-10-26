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

// Bilingual transliteration dictionary for Egyptian names
const TRANSLITERATION_PAIRS: Array<[string[], string]> = [
  [['mohamed', 'mohammed', 'muhammad', 'muhammed', 'mohd', 'mhd', 'medo'], 'محمد'],
  [['ahmed', 'ahmad', 'ahmd'], 'احمد'],
  [['mahmoud', 'mahmud'], 'محمود'],
  [['youssef', 'yousef', 'yosif', 'joseph'], 'يوسف'],
  [['wael', 'waiel'], 'وائل'],
  [['hosny', 'hosni', 'husny', 'husni'], 'حسني'],
  [['kamel', 'kamil'], 'كامل'],
  [['dina', 'deena'], 'دينا'],
  [['nouray', 'noray', 'nourai', 'nori'], 'نوراي'],
  [['khaled', 'khalid'], 'خالد'],
  [['hassan', 'hasan'], 'حسن'],
  [['elsaeed', 'elsayed', 'saeed', 'sayed'], 'السعيد'],
  [['wehedy', 'wahedy', 'waheedy', 'wahidi'], 'وهيدي'],
  [['zehni', 'zahny', 'zihni'], 'ذهني'],
  [['noureldin', 'nour el din', 'nouraldin', 'nour eldin'], 'نورالدين'],
  [['abubakr', 'abobakr', 'abu bakr', 'abou bakr', 'abo bakr'], 'ابوبكر'],
  [['ali', 'aly'], 'علي'],
  [['omar'], 'عمر'],
  [['amr'], 'عمرو'],
  [['ibrahim', 'ebrahim'], 'ابراهيم'],
  [['mostafa', 'mustafa'], 'مصطفي'],
  [['tarek', 'tarik'], 'طارق'],
  [['nour', 'noor'], 'نور'],
  [['mariam', 'maryam', 'mariem'], 'مريم'],
  [['salma'], 'سلمي'],
  [['sarah', 'sara'], 'ساره'],
  [['menna', 'mennatallah'], 'منه'],
  [['aya', 'ayah'], 'ايه'],
  [['nada'], 'ندي'],
  [['fatma', 'fatima'], 'فاطمه'],
  [['reem'], 'ريم'],
  [['rana'], 'رنا'],
  [['shahd'], 'شهد'],
  [['nourhan', 'nourhanne'], 'نورهان'],
  [['habiba'], 'حبيبه'],
  [['malak'], 'ملك'],
  [['farah'], 'فرح'],
  [['jana', 'ganna'], 'جني'],
  [['karim', 'kareem'], 'كريم'],
  [['ziad', 'zeyad'], 'زياد'],
  [['adham'], 'ادهم'],
  [['seif', 'saif'], 'سيف'],
  [['sherif', 'shereef'], 'شريف'],
  [['samir', 'sameer'], 'سمير'],
  [['ashraf'], 'اشرف'],
  [['george'], 'جورج'],
  [['mina'], 'مينا'],
  [['peter'], 'بيتر'],
  [['mark'], 'مارك'],
  [['fady', 'fadi'], 'فادي'],
  [['hazem'], 'حازم'],
  [['hossam', 'hussam'], 'حسام'],
  [['islam', 'eslam'], 'اسلام'],
  [['assem'], 'عاصم'],
  [['akram'], 'اكرم'],
  [['ayman'], 'ايمن'],
  [['bassem'], 'باسم'],
  [['gamal'], 'جمال'],
  [['hamza'], 'حمزه'],
  [['hany', 'hani'], 'هاني'],
  [['hesham', 'hisham'], 'هشام'],
  [['kamal'], 'كمال'],
  [['mazen'], 'مازن'],
  [['nabil'], 'نبيل'],
  [['nasser'], 'ناصر'],
  [['ramy', 'rami'], 'رامي'],
  [['samy', 'sami'], 'سامي'],
  [['shady'], 'شادي'],
  [['tamer'], 'تامر'],
  [['walid', 'waled'], 'وليد'],
  [['yahia', 'yehia'], 'يحيي'],
];

const EN_TO_AR_MAP = new Map<string, string>();
for (const [enList, ar] of TRANSLITERATION_PAIRS) {
  for (const en of enList) {
    EN_TO_AR_MAP.set(en, ar);
  }
}

/**
 * Normalizes Arabic text for resilient comparison:
 * - Unifies alefs (أ, إ, آ, ٱ -> ا)
 * - Unifies taa marbuta (ة -> ه)
 * - Unifies yaa/alef maqsura (ى, ي -> ي)
 * - Unifies compound names (عبد الرحمن -> عبدالرحمن, ابو بكر -> ابوبكر, نور الدين -> نورالدين)
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
    .replace(/[ىي]/g, 'ي')
    // Compound names unification
    .replace(/عبد\s+/g, 'عبد')
    .replace(/ابو\s+/g, 'ابو')
    .replace(/نور\s+الدين/g, 'نورالدين')
    .replace(/سيف\s+الدين/g, 'سيفالدين')
    .replace(/علاء\s+الدين/g, 'علاءالدين')
    .replace(/حسام\s+الدين/g, 'حسامالدين')
    .replace(/ضياء\s+الدين/g, 'ضياءالدين')
    .replace(/تقي\s+الدين/g, 'تقيالدين')
    .replace(/بهاء\s+الدين/g, 'بهاءالدين')
    .replace(/شمس\s+الدين/g, 'شمسالدين')
    .replace(/عماد\s+الدين/g, 'عمادالدين')
    .replace(/محي\s+الدين/g, 'محيالدين')
    .replace(/بدر\s+الدين/g, 'بدرالدين')
    .replace(/جلال\s+الدين/g, 'جلالالدين')
    .replace(/جمال\s+الدين/g, 'جمالالدين')
    .replace(/عز\s+الدين/g, 'عزالدين')
    .replace(/[^a-z0-9\u0621-\u064A\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes English text for resilient comparison:
 * Removes non-latin characters and compound spaces.
 * CRITICAL: Returns empty string if no latin letters are found!
 */
export function normalizeEnglishName(text: string): string {
  if (!text) return '';
  const s = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/abdel\s+/g, 'abdel')
    .replace(/abdul\s+/g, 'abdul')
    .replace(/abu\s+/g, 'abubakr')
    .replace(/el\s+din/g, 'eldin')
    .replace(/al\s+din/g, 'aldin')
    .replace(/\s+/g, ' ')
    .trim();

  // If text contains no latin letters or is shorter than 3 characters, return empty string
  if (!/[a-z]/.test(s) || s.length < 3) return '';
  return s;
}

function convertEnglishToApproxArabicTokens(enText: string): string[] {
  const norm = normalizeEnglishName(enText);
  if (!norm) return [];
  const words = norm.split(' ').filter(Boolean);
  return words.map((w) => EN_TO_AR_MAP.get(w) || w);
}

/**
 * Robust bilingual matching metric:
 * - MANDATORY: First names MUST match (either direct or transliterated).
 * - Multi-token overlap: counts how many other parts (father, last name) match.
 * - Prevents false positive matching on common middle names like "Mohamed".
 */
export function calculateBilingualNameSimilarity(
  rawName: string,
  candidate: GeminiStudentCandidate
): { score: number; reason: string } {
  const rawAr = normalizeArabicName(rawName);
  const rawEn = normalizeEnglishName(rawName);

  const candAr = normalizeArabicName(candidate.full_name_ar || '');
  const candEn = normalizeEnglishName(candidate.full_name_en || '');

  // 1. Exact string matches
  if (rawAr && candAr && rawAr === candAr) {
    return { score: 1.0, reason: 'Exact Arabic Match' };
  }
  if (rawEn && candEn && rawEn === candEn) {
    return { score: 1.0, reason: 'Exact English Match' };
  }

  // 2. Tokenize
  const rawTokensAr = rawAr ? rawAr.split(' ').filter(Boolean) : [];
  const candTokensAr = candAr ? candAr.split(' ').filter(Boolean) : [];

  const rawTokensEn = rawEn ? rawEn.split(' ').filter(Boolean) : [];
  const candTokensEn = candEn ? candEn.split(' ').filter(Boolean) : [];

  // Cross-lingual phonetic tokens
  const rawApproxAr = rawTokensEn.length > 0 ? convertEnglishToApproxArabicTokens(rawEn) : [];
  const candApproxAr = candTokensEn.length > 0 ? convertEnglishToApproxArabicTokens(candEn) : [];

  const allRawArTokens = Array.from(new Set([...rawTokensAr, ...rawApproxAr]));
  const allCandArTokens = Array.from(new Set([...candTokensAr, ...candApproxAr]));

  if (allRawArTokens.length === 0 || allCandArTokens.length === 0) {
    return { score: 0, reason: 'Unmatched' };
  }

  // 3. FIRST NAME VERIFICATION (CRITICAL: Different first names must NEVER match)
  const rawFirstName = allRawArTokens[0];
  const candFirstName = allCandArTokens[0];

  const firstNameMatch = rawFirstName === candFirstName;
  if (!firstNameMatch) {
    // Check if English first names match directly
    const rawEnFirst = rawTokensEn[0];
    const candEnFirst = candTokensEn[0];
    const enFirstMatch = !!(rawEnFirst && candEnFirst && rawEnFirst === candEnFirst);

    if (!enFirstMatch) {
      return { score: 0, reason: 'Different First Name' };
    }
  }

  // 4. Count matching tokens across full names
  let matchCount = 0;
  for (const t of allRawArTokens) {
    if (allCandArTokens.includes(t)) {
      matchCount++;
    }
  }

  // Full exact token match
  if (matchCount === allRawArTokens.length && allRawArTokens.length === allCandArTokens.length) {
    return { score: 1.0, reason: 'Exact Name Components Match' };
  }

  if (matchCount >= 3) {
    return { score: 0.95, reason: `High Token Overlap (${matchCount} names matched)` };
  }
  if (matchCount === 2) {
    return { score: 0.85, reason: `Partial Match (${matchCount} names matched)` };
  }
  if (matchCount === 1) {
    // Only 1 name matched (e.g. only first name)! Too ambiguous to auto-match safely.
    return { score: 0.35, reason: `Ambiguous: Only First Name matched ("${rawFirstName}")` };
  }

  return { score: 0, reason: 'Unmatched' };
}

/**
 * Arabic ordinals dictionary for session header detection
 */
const ARABIC_ORDINALS: Record<string, number> = {
  الاول: 1,
  الاولى: 1,
  اولى: 1,
  اول: 1,
  الثاني: 2,
  الثانيه: 2,
  تانيه: 2,
  تاني: 2,
  الثالث: 3,
  الثالثه: 3,
  تالته: 3,
  تالت: 3,
  الرابع: 4,
  الرابعه: 4,
  رابعه: 4,
  رابع: 4,
  الخامس: 5,
  الخامسه: 5,
  خامسه: 5,
  خامس: 5,
  السادس: 6,
  السادسه: 6,
  سادسه: 6,
  سادس: 6,
  السابع: 7,
  السابعه: 7,
  سابعه: 7,
  سابع: 7,
  الثامن: 8,
  الثامنه: 8,
  تامنه: 8,
  تامن: 8,
  التاسع: 9,
  التاسعه: 9,
  تاسعه: 9,
  تاسع: 9,
  العاشر: 10,
  العاشره: 10,
  عاشره: 10,
  عاشر: 10,
};

/**
 * Calls Gemini Flash to analyze attendance sheet data against system database records.
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
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    '';

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

  if (!apiKey) {
    console.warn('[GeminiAttendance] No GEMINI_API_KEY set, using enhanced deterministic engine.');
    return localHeuristicAttendanceMatcher({
      sheetHeaders,
      sheetRows: cleanedRows,
      availableSessions,
      enrolledStudents,
    });
  }

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

=== SYSTEM REGISTERED STUDENTS (${enrolledStudents.length} candidates) ===
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

=== RULES & CRITICAL INSTRUCTIONS ===
1. SESSION MAPPING:
   - Identify columns corresponding to session/lecture attendance (e.g. "المحاضرة الأولى", "المحاضرة 1", "Session 1", "S1", "Lec 1", "Week 2", or numbers/dates).
   - Map each session column to the matching session ID from the SYSTEM REGISTERED SESSIONS.
   - If a column is a student name, serial number, ID, or phone number, DO NOT map it to a session.

2. BILINGUAL NAME MATCHING & STRICT CONSTRAINTS:
   - Identify the primary student name column.
   - Reconcile Arabic and English spelling variations (e.g. "يوسف وائل" matches "Youssef Wael", "احمد" matches "Ahmed").
   - CRITICAL NEGATIVE CONSTRAINT: DO NOT match students who merely share common Arabic middle names like 'Mohamed' or 'Ahmed'.
     A valid match MUST match the person's FIRST name + at least one other name component (father, family, or last name).
     If the first name does not match, or the student is not in the system, set matchedStudentId to null and matchType to 'unmatched'.
   - Assign matchConfidence (between 0.0 and 1.0):
     * 0.95 - 1.00: "exact" (identical or complete token match).
     * 0.70 - 0.94: "high_confidence" (first name + father/last name match).
     * 0.40 - 0.69: "needs_review" (partial match, ambiguous, or multiple same-name candidates).
     * < 0.40: "unmatched" (student is not found in database).

3. ATTENDANCE STATUS TOKEN NORMALIZATION:
   - For each mapped session column, classify the student's status into one of:
     * "present": if cell contains "حاضر", "حضر", "P", "1", "نعم", "Yes", "Present", "V", "True", "✔", or confirmation.
     * "absent": if cell contains "غائب", "غ", "A", "0", "لا", "No", "Absent", "False", "x", or is empty / missing.
     * "excused": if cell contains "معتذر", "بعذر", "عذر", "Excused", "E", "Sick", or permission.

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

  // Candidate models
  const modelCandidates = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];

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
              temperature: 0.1,
            },
          }),
        }
      );

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        console.warn(`[GeminiAttendance] Model ${model} returned error:`, errJson);
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
    }
  }

  // Fallback to enhanced local deterministic engine
  console.warn('[GeminiAttendance] Falling back to enhanced deterministic matching engine...');
  return localHeuristicAttendanceMatcher({
    sheetHeaders,
    sheetRows: cleanedRows,
    availableSessions,
    enrolledStudents,
  });
}

/**
 * Enhanced deterministic fallback engine:
 * High-accuracy Arabic & English phonetic matching + multi-token verification.
 */
export function localHeuristicAttendanceMatcher(params: {
  sheetHeaders: string[];
  sheetRows: Record<string, any>[];
  availableSessions: GeminiSessionCandidate[];
  enrolledStudents: GeminiStudentCandidate[];
}): GeminiAttendanceAnalysisResult {
  const { sheetHeaders, sheetRows, availableSessions, enrolledStudents } = params;

  // 1. Identify Name Column
  let nameCol =
    sheetHeaders.find((h) => /اسم|الاسم|طالب|name|student/i.test(h)) ||
    sheetHeaders[0] ||
    'Name';

  // 2. Identify Session Columns
  const sessionMappings: SessionColumnMapping[] = [];
  const detectedSessionCols: string[] = [];

  for (const h of sheetHeaders) {
    if (h === nameCol) continue;
    const normH = normalizeArabicName(h);

    let detectedSessNum: number | null = null;

    // Check Arabic ordinals (e.g. "المحاضرة الاولى" -> 1)
    for (const [ordWord, num] of Object.entries(ARABIC_ORDINALS)) {
      if (normH.includes(ordWord)) {
        detectedSessNum = num;
        break;
      }
    }

    // Check digit patterns (e.g. "محاضرة 1", "Session 2", "S1", "Lec 3", or raw "1", "2")
    if (detectedSessNum === null) {
      const match = h.match(/(?:محاضرة|سيشن|حضور|session|lec|lecture|week|w|s)?\s*([0-9]+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= 1 && num <= 50) {
          detectedSessNum = num;
        }
      }
    }

    if (detectedSessNum !== null) {
      const targetSess = availableSessions.find((s) => s.session_number === detectedSessNum);
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

    let bestMatch: GeminiStudentCandidate | null = null;
    let bestScore = 0;
    let bestReason = '';

    for (const student of enrolledStudents) {
      const sim = calculateBilingualNameSimilarity(rawName, student);
      if (sim.score > bestScore) {
        bestScore = sim.score;
        bestMatch = student;
        bestReason = sim.reason;
      }
    }

    // Extract attendance per session
    const attendanceBySessionId: StudentRowAttendanceMatch['attendanceBySessionId'] = {};

    for (const sm of sessionMappings) {
      if (!sm.matchedSessionId) continue;
      const rawVal = String(row[sm.columnName] || '').trim();
      let status: 'present' | 'absent' | 'excused' = 'absent';

      if (/حاضر|حضر|p|1|yes|نعم|v|true|✔|✓/i.test(rawVal)) {
        status = 'present';
      } else if (/معتذر|بعذر|عذر|excused|e|sick/i.test(rawVal)) {
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
      matchedStudentId: bestMatch && bestScore >= 0.4 ? bestMatch.id : null,
      matchedStudentName:
        bestMatch && bestScore >= 0.4
          ? `${bestMatch.full_name_en} (${bestMatch.full_name_ar || ''})`
          : null,
      matchedStudentEmail: bestMatch && bestScore >= 0.4 ? bestMatch.email : null,
      matchConfidence: bestScore,
      matchType: bestScore >= 0.4 ? matchType : 'unmatched',
      matchReason: bestReason || 'Unmatched student record',
      attendanceBySessionId,
    });
  });

  return {
    success: true,
    modelUsed: 'enhanced-bilingual-matcher',
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
