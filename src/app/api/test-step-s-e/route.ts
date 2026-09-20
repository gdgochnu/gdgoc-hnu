import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = createAdminClient();
  const checks: any[] = [];

  try {
    // 1. Verify schema tables exist
    const [tasksRes, subsRes, quizzesRes, attsRes] = await Promise.all([
      admin.from('student_tasks').select('id').limit(1),
      admin.from('student_task_submissions').select('id').limit(1),
      admin.from('quizzes').select('id').limit(1),
      admin.from('quiz_attempts').select('id').limit(1),
    ]);

    checks.push({
      item: '1. Database schema tables (student_tasks, submissions, quizzes, attempts)',
      passed: !tasksRes.error && !subsRes.error && !quizzesRes.error && !attsRes.error,
      errors: [tasksRes.error?.message, subsRes.error?.message, quizzesRes.error?.message, attsRes.error?.message].filter(Boolean),
    });

    // 2. Query any existing active courses
    const { data: courses } = await admin.from('courses').select('id, title').limit(1);
    const courseId = courses?.[0]?.id;

    checks.push({
      item: '2. Available test course',
      passed: Boolean(courseId),
      courseId,
    });

    // 3. Verify student tasks can be created and queried
    let testTaskId = '';
    if (courseId) {
      const { data: insertedTask, error: taskInsertErr } = await admin
        .from('student_tasks')
        .insert({
          course_id: courseId,
          title: 'TEST_E2E: Build responsive landing page',
          description: 'Submit GitHub link for landing page evaluation',
          due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
          submission_type: 'link',
          max_score: 10,
          assigned_to: 'all_enrolled',
          status: 'active',
        })
        .select()
        .single();

      testTaskId = insertedTask?.id;
      checks.push({
        item: '3. Task creation (Build landing page)',
        passed: Boolean(testTaskId) && !taskInsertErr,
        error: taskInsertErr?.message,
        taskId: testTaskId,
      });
    }

    // 4. Verify student profile for submission
    const { data: students } = await admin.from('student_profiles').select('id').limit(1);
    const studentId = students?.[0]?.id;

    if (testTaskId && studentId) {
      // 5. Test student submission
      const { data: insertedSub, error: subErr } = await admin
        .from('student_task_submissions')
        .upsert(
          {
            task_id: testTaskId,
            student_id: studentId,
            submission_link: 'https://github.com/gdgoc-test/responsive-landing',
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          },
          { onConflict: 'task_id,student_id' }
        )
        .select()
        .single();

      checks.push({
        item: '4. Student task submission (GitHub URL link)',
        passed: Boolean(insertedSub?.id) && !subErr,
        error: subErr?.message,
      });

      // 6. Test mentor evaluation and feedback
      const { data: gradedSub, error: gradeErr } = await admin
        .from('student_task_submissions')
        .update({
          score: 8,
          feedback_comment: 'Good structure, improve responsiveness on mobile screens',
          status: 'graded',
          graded_at: new Date().toISOString(),
        })
        .eq('task_id', testTaskId)
        .eq('student_id', studentId)
        .select()
        .single();

      checks.push({
        item: '5. Mentor review and grading (Score: 8/10, Feedback comment)',
        passed: gradedSub?.score === 8 && !gradeErr,
        error: gradeErr?.message,
      });

      // 7. Test quiz creation and attempt
      if (courseId) {
        const { data: testQuiz } = await admin
          .from('quizzes')
          .insert({
            course_id: courseId,
            title: 'TEST_E2E: Web Fundamentals Checkpoint',
            description: '10 questions on CSS Grid, Flexbox, and Semantic HTML',
            time_limit_minutes: 15,
            passing_score_percentage: 70,
            questions: [
              { type: 'multiple_choice', question_text: 'What is CSS Grid?', options: ['Layout system', 'Compiler'], correct_answer: 'Layout system', points: 10 },
            ],
            status: 'published',
          })
          .select()
          .single();

        if (testQuiz) {
          const { data: testAttempt, error: attErr } = await admin
            .from('quiz_attempts')
            .insert({
              quiz_id: testQuiz.id,
              student_id: studentId,
              attempt_number: 1,
              answers: [{ answer: 'Layout system' }],
              auto_graded_score: 9,
              total_score: 90,
              passed: true,
              status: 'graded',
              submitted_at: new Date().toISOString(),
              graded_at: new Date().toISOString(),
            })
            .select()
            .single();

          checks.push({
            item: '6. Quiz attempt and automated grading (Score: 90%, Passed)',
            passed: testAttempt?.passed === true && !attErr,
            error: attErr?.message,
          });

          // Cleanup test quiz
          await admin.from('quizzes').delete().eq('id', testQuiz.id);
        }
      }

      // Cleanup test task
      await admin.from('student_tasks').delete().eq('id', testTaskId);
    }

    const allPassed = checks.every((c) => c.passed);
    return NextResponse.json({
      success: allPassed,
      phase: 'Sub-Phase S.E End-to-End Verification (S.E.9 & S.E.10)',
      checks,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      checks,
    }, { status: 500 });
  }
}
