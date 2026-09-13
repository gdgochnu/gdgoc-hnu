-- ==============================================================================
-- GDGoC HNU OS — Migration 028: Branch Leadership Committees & Official Committees
-- Seeds Technical Branch Leadership and Non-Technical Branch Leadership
-- Enforces single Branch Head per branch logic
-- ==============================================================================

INSERT INTO public.departments (code, name, branch, description)
VALUES
    ('TECH_LEAD', 'Technical Branch Leadership', 'tech', 'Executive leadership and technical cross-committee oversight for Web, AI, Mobile, and Cloud engineering.'),
    ('NON_TECH_LEAD', 'Non-Technical Branch Leadership', 'non_tech', 'Executive leadership and organizational cross-committee oversight for HR, PR, Media, and Operations.'),
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
