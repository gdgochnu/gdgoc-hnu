'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import {
  Quiz,
  QuizQuestion,
  QuizQuestionType,
  QuizAttempt,
} from '@/types/student';

export interface SanitizedQuizQuestion {
  id: string;
  type: QuizQuestionType;
  question_text: string;
  options?: string[];
  points: number;
}

export interface StudentQuizData {
  id: string;
  course_id: string;
  title: string;
  description: string;
  time_limit_minutes: number | null;
  passing_score_percentage: number;
  allow_retakes: boolean;
  max_attempts: number;
  status: string;
  lesson?: {
    id: string;
    lesson_number: number;
    title: string;
  } | null;
  questions: SanitizedQuizQuestion[];
  totalPoints: number;
}

export interface StudentQuizPageResult {
  success: boolean;
  quiz?: StudentQuizData;
  course?: {
    id: string;
    title: string;
    cover_image_url: string | null;
  };
  existingAttempts: QuizAttempt[];
  canAttempt: boolean;
  nextAttemptNumber: number;
  reason?: string;
  error?: string;
}

export interface SubmitQuizAnswerPayload {
  question_id: string;
  answer: any; // number (option index), 'True'|'False', or text string
}

export interface SubmitQuizResult {
  success: boolean;
  attempt?: QuizAttempt;
  scoreSummary?: {
    totalPoints: number;
    maxPoints: number;
    percentage: number;
    passed: boolean | null;
    status: 'submitted' | 'graded';
    hasOpenEnded: boolean;
  };
  error?: string;
}

/**
 * Get authenticated student's profile ID
 */
async function getStudentProfileId(): Promise<{ studentProfileId: string | null; error?: string }> {
  const context = await getUserContext();
  if (!context.user) {
    return { studentProfileId: null, error: 'Unauthorized: Please sign in.' };
  }

  const admin = createAdminClient();
  const { data: studentProfile } = await admin
    .from('student_profiles')
    .select('id')
    .or(`team_profile_id.eq.${context.user.id},email.eq.${context.user.email || ''}`)
    .maybeSingle();

  if (!studentProfile) {
    return { studentProfileId: null, error: 'Student profile not found. Please complete your registration.' };
  }

  return { studentProfileId: studentProfile.id };
}

/**
 * Fetch quiz data sanitized for student examination
 */
export async function getQuizForTaking(courseId: string, quizId: string): Promise<StudentQuizPageResult> {
  try {
    const { studentProfileId, error: authError } = await getStudentProfileId();
    if (authError || !studentProfileId) {
      return { success: false, existingAttempts: [], canAttempt: false, nextAttemptNumber: 1, error: authError };
    }

    const admin = createAdminClient();

    // 1. Verify enrollment in course
    const { data: enrollment } = await admin
      .from('course_enrollments')
      .select('id, status')
      .eq('course_id', courseId)
      .eq('student_id', studentProfileId)
      .eq('status', 'confirmed')
      .maybeSingle();

    if (!enrollment) {
      return {
        success: false,
        existingAttempts: [],
        canAttempt: false,
        nextAttemptNumber: 1,
        error: 'You are not enrolled in this course or your enrollment has not been confirmed.',
      };
    }

    // 2. Fetch course header
    const { data: course } = await admin
      .from('courses')
      .select('id, title, cover_image_url')
      .eq('id', courseId)
      .single();

    // 3. Fetch Quiz
    const { data: quiz, error: quizError } = await admin
      .from('quizzes')
      .select(`
        id,
        course_id,
        title,
        description,
        time_limit_minutes,
        passing_score_percentage,
        allow_retakes,
        max_attempts,
        status,
        questions,
        lesson:course_lessons(id, lesson_number, title)
      `)
      .eq('id', quizId)
      .eq('course_id', courseId)
      .eq('status', 'published')
      .maybeSingle();

    if (quizError || !quiz) {
      return {
        success: false,
        existingAttempts: [],
        canAttempt: false,
        nextAttemptNumber: 1,
        error: 'Quiz not found or has not been published yet.',
      };
    }

    // 4. Fetch previous attempts
    const { data: attempts } = await admin
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('student_id', studentProfileId)
      .order('attempt_number', { ascending: true });

    const existingAttempts: QuizAttempt[] = (attempts || []).map((a: any) => ({
      ...a,
      answers: a.answers || [],
    }));

    // 5. Evaluate eligibility
    const attemptCount = existingAttempts.length;
    const hasPassed = existingAttempts.some((a) => a.passed === true);
    let canAttempt = true;
    let reason = '';

    if (hasPassed && !quiz.allow_retakes) {
      canAttempt = false;
      reason = 'You have already passed this quiz. Retakes are not permitted.';
    } else if (attemptCount >= quiz.max_attempts && !quiz.allow_retakes) {
      canAttempt = false;
      reason = `You have reached the maximum of ${quiz.max_attempts} attempts for this quiz.`;
    }

    // 6. Sanitize questions (remove correct answers and explanations before student starts)
    const rawQuestions: QuizQuestion[] = Array.isArray(quiz.questions) ? quiz.questions : [];
    let totalPoints = 0;

    const sanitizedQuestions: SanitizedQuizQuestion[] = rawQuestions.map((q, idx) => {
      const pts = Number(q.points) || 1;
      totalPoints += pts;

      let opts: string[] = [];
      if (Array.isArray(q.options)) {
        opts = q.options.map((opt) => (typeof opt === 'string' ? opt : (opt as any).text || ''));
      }

      return {
        id: q.id || `q_${idx + 1}`,
        type: q.type,
        question_text: q.question_text,
        options: opts,
        points: pts,
      };
    });

    const lsn = Array.isArray(quiz.lesson) ? quiz.lesson[0] : quiz.lesson;

    return {
      success: true,
      quiz: {
        id: quiz.id,
        course_id: quiz.course_id,
        title: quiz.title,
        description: quiz.description || '',
        time_limit_minutes: quiz.time_limit_minutes,
        passing_score_percentage: Number(quiz.passing_score_percentage) || 60,
        allow_retakes: Boolean(quiz.allow_retakes),
        max_attempts: Number(quiz.max_attempts) || 1,
        status: quiz.status,
        lesson: lsn || null,
        questions: sanitizedQuestions,
        totalPoints,
      },
      course: course || undefined,
      existingAttempts,
      canAttempt,
      nextAttemptNumber: attemptCount + 1,
      reason,
    };
  } catch (err: any) {
    console.error('getQuizForTaking error:', err);
    return {
      success: false,
      existingAttempts: [],
      canAttempt: false,
      nextAttemptNumber: 1,
      error: err.message || 'Failed to load quiz.',
    };
  }
}

/**
 * Submit quiz answers, auto-grade multiple choice / true-false, record attempt
 */
export async function submitQuizAttempt(
  courseId: string,
  quizId: string,
  answersPayload: SubmitQuizAnswerPayload[],
  timeSpentSeconds: number
): Promise<SubmitQuizResult> {
  try {
    const { studentProfileId, error: authError } = await getStudentProfileId();
    if (authError || !studentProfileId) {
      return { success: false, error: authError };
    }

    const admin = createAdminClient();

    // 1. Fetch full quiz with correct answers
    const { data: quiz, error: quizError } = await admin
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .eq('course_id', courseId)
      .single();

    if (quizError || !quiz) {
      return { success: false, error: 'Quiz not found.' };
    }

    // 2. Fetch existing attempts to determine next attempt number & enforce restrictions
    const { data: existingAttempts } = await admin
      .from('quiz_attempts')
      .select('id, attempt_number, passed')
      .eq('quiz_id', quizId)
      .eq('student_id', studentProfileId)
      .order('attempt_number', { ascending: true });

    const attemptsCount = existingAttempts?.length || 0;
    const hasPassed = (existingAttempts || []).some((a) => a.passed === true);

    if (hasPassed && !quiz.allow_retakes) {
      return { success: false, error: 'You have already passed this quiz and retakes are disabled.' };
    }
    if (attemptsCount >= quiz.max_attempts && !quiz.allow_retakes) {
      return { success: false, error: `Maximum attempts limit (${quiz.max_attempts}) reached.` };
    }

    const nextAttemptNumber = attemptsCount + 1;

    // 3. Grade the answers
    const rawQuestions: QuizQuestion[] = Array.isArray(quiz.questions) ? quiz.questions : [];
    const answersMap = new Map<string, any>();
    answersPayload.forEach((a) => answersMap.set(a.question_id, a.answer));

    let autoGradedScore = 0;
    let maxPoints = 0;
    let hasOpenEnded = false;

    const evaluatedAnswers: Array<{
      question_id: string;
      type: QuizQuestionType;
      question_text: string;
      student_answer: any;
      correct_answer?: any;
      is_correct?: boolean;
      points_possible: number;
      points_awarded: number;
      is_auto_graded: boolean;
      explanation?: string;
      manual_comment?: string;
    }> = [];

    for (const q of rawQuestions) {
      const qId = q.id;
      const pts = Number(q.points) || 1;
      maxPoints += pts;

      const studentAns = answersMap.get(qId);

      if (q.type === 'multiple_choice') {
        let isCorrect = false;
        // Check both index match and text match
        if (typeof q.correct_answer === 'number') {
          isCorrect = studentAns === q.correct_answer;
        } else if (typeof q.correct_answer === 'string') {
          if (Array.isArray(q.options)) {
            const optTexts = q.options.map((opt) => (typeof opt === 'string' ? opt : (opt as any).text || ''));
            const selectedText = typeof studentAns === 'number' ? optTexts[studentAns] : studentAns;
            isCorrect = selectedText?.trim()?.toLowerCase() === q.correct_answer?.trim()?.toLowerCase();
          } else {
            isCorrect = String(studentAns).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();
          }
        }

        const awarded = isCorrect ? pts : 0;
        autoGradedScore += awarded;

        evaluatedAnswers.push({
          question_id: qId,
          type: q.type,
          question_text: q.question_text,
          student_answer: studentAns !== undefined ? studentAns : null,
          correct_answer: q.correct_answer,
          is_correct: isCorrect,
          points_possible: pts,
          points_awarded: awarded,
          is_auto_graded: true,
          explanation: q.explanation || '',
        });
      } else if (q.type === 'true_false') {
        const studentStr = String(studentAns || '').trim().toLowerCase();
        const correctStr = String(q.correct_answer || 'true').trim().toLowerCase();
        const isCorrect = studentStr === correctStr;
        const awarded = isCorrect ? pts : 0;
        autoGradedScore += awarded;

        evaluatedAnswers.push({
          question_id: qId,
          type: q.type,
          question_text: q.question_text,
          student_answer: studentAns !== undefined ? studentAns : null,
          correct_answer: q.correct_answer,
          is_correct: isCorrect,
          points_possible: pts,
          points_awarded: awarded,
          is_auto_graded: true,
          explanation: q.explanation || '',
        });
      } else if (q.type === 'short_answer') {
        hasOpenEnded = true;
        // Short answer requires manual grading by mentor
        evaluatedAnswers.push({
          question_id: qId,
          type: q.type,
          question_text: q.question_text,
          student_answer: studentAns !== undefined ? String(studentAns).trim() : '',
          correct_answer: q.correct_answer,
          is_correct: undefined,
          points_possible: pts,
          points_awarded: 0,
          is_auto_graded: false,
          explanation: q.explanation || '',
        });
      }
    }

    // 4. Determine status and percentage
    let totalScore = autoGradedScore;
    let passed: boolean | null = null;
    let status: 'submitted' | 'graded' = 'graded';

    if (hasOpenEnded) {
      status = 'submitted'; // Needs manual grading
      passed = null;
    } else {
      status = 'graded';
      const percentage = maxPoints > 0 ? (totalScore / maxPoints) * 100 : 0;
      passed = percentage >= (Number(quiz.passing_score_percentage) || 60);
    }

    const percentage = maxPoints > 0 ? Math.round((totalScore / maxPoints) * 100) : 0;

    // 5. Insert row into quiz_attempts
    const { data: newAttempt, error: insertError } = await admin
      .from('quiz_attempts')
      .insert({
        quiz_id: quizId,
        student_id: studentProfileId,
        attempt_number: nextAttemptNumber,
        answers: evaluatedAnswers,
        auto_graded_score: autoGradedScore,
        manual_graded_score: hasOpenEnded ? null : 0,
        total_score: totalScore,
        passed,
        status,
        started_at: new Date(Date.now() - Math.max(1, timeSpentSeconds) * 1000).toISOString(),
        submitted_at: new Date().toISOString(),
        feedback: hasOpenEnded ? 'Submitted. Open-ended questions are pending instructor review.' : null,
      })
      .select('*')
      .single();

    if (insertError || !newAttempt) {
      console.error('submitQuizAttempt insert error:', insertError);
      return { success: false, error: 'Failed to record quiz submission.' };
    }

    revalidatePath(`/student/courses/${courseId}`);
    revalidatePath(`/student/courses/${courseId}/quizzes/${quizId}/take`);
    revalidatePath(`/student-portal/admin/courses/${courseId}/quizzes`);

    return {
      success: true,
      attempt: {
        ...newAttempt,
        answers: evaluatedAnswers,
      },
      scoreSummary: {
        totalPoints: totalScore,
        maxPoints,
        percentage,
        passed,
        status,
        hasOpenEnded,
      },
    };
  } catch (err: any) {
    console.error('submitQuizAttempt error:', err);
    return { success: false, error: err.message || 'An unexpected error occurred during submission.' };
  }
}
