-- ==============================================================================
-- GDGoC HNU OS — Migration 011: Seed Official Chapter Committees
-- Step 2.3 Companion
-- Spec reference: §1.2, §3.1
-- ==============================================================================

INSERT INTO public.departments (code, name, branch, description)
VALUES
    ('WEB', 'Web Development', 'tech', 'Frontend, Backend, and Full-Stack web engineering using modern web standards.'),
    ('AI', 'AI & Machine Learning', 'tech', 'Deep learning, LLMs, computer vision, data science, and intelligent systems.'),
    ('MOBILE', 'Mobile Development', 'tech', 'Cross-platform and native mobile apps with Flutter, Android, and Kotlin.'),
    ('CLOUD', 'Cloud & DevOps', 'tech', 'Google Cloud Platform, infrastructure as code, CI/CD, and scalable deployments.'),
    ('HR', 'Human Resources', 'non_tech', 'Member talent recruitment, onboarding, engagement tracking, and chapter evaluations.'),
    ('PR', 'Public Relations', 'non_tech', 'Sponsorships, external industry partnerships, university relations, and guest speakers.'),
    ('MEDIA', 'Media & Branding', 'non_tech', 'Visual identity, graphic design, social media content creation, and event photography.'),
    ('OPS', 'Operations & Logistics', 'non_tech', 'Event planning, venue coordination, equipment setup, and on-ground execution.')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    branch = EXCLUDED.branch,
    description = EXCLUDED.description;
