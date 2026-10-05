export interface SocialChannelConfig {
  id: string;
  name: string;
  nameAr: string;
  url: string;
  iconType: 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'linkedin' | 'whatsapp';
  brandColor: string;
  gradient: string;
  actionText: string;
  actionTextAr: string;
  description: string;
  descriptionAr: string;
  requiredWaitSeconds: number;
}

export const MANDATORY_SOCIAL_CHANNELS: SocialChannelConfig[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    nameAr: 'قناة اليوتيوب الرسمية',
    url: 'https://www.youtube.com/@GDGoC',
    iconType: 'youtube',
    brandColor: '#FF0000',
    gradient: 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)',
    actionText: 'Subscribe on YouTube',
    actionTextAr: 'اشترك في قناة اليوتيوب 🔴',
    description: 'Watch recorded tech workshops, keynote sessions, and coding tutorials.',
    descriptionAr: 'شاهد الورش التقنية المسجلة، الجلسات التعريفية، والشروحات البرمجية الحصرية.',
    requiredWaitSeconds: 5,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    nameAr: 'صفحة الفيسبوك الرسمية',
    url: 'https://www.facebook.com/GDGoC',
    iconType: 'facebook',
    brandColor: '#1877F2',
    gradient: 'linear-gradient(135deg, #1877F2 0%, #0D65D9 100%)',
    actionText: 'Follow on Facebook',
    actionTextAr: 'متابعة صفحة الفيسبوك 📘',
    description: 'Get live event announcements, photo albums, and community news.',
    descriptionAr: 'تابع إعلانات الفعاليات القادمة، ألبومات الصور، وأحدث أخبار مجتمع الجامعة.',
    requiredWaitSeconds: 5,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    nameAr: 'حساب إنستغرام الرسمي',
    url: 'https://www.instagram.com/gdgochnu',
    iconType: 'instagram',
    brandColor: '#E4405F',
    gradient: 'linear-gradient(135deg, #833AB4 0%, #FD1D1D 50%, #FCB045 100%)',
    actionText: 'Follow on Instagram',
    actionTextAr: 'متابعة حساب إنستغرام 📸',
    description: 'Behind-the-scenes stories, event reels, reminders, and community highlights.',
    descriptionAr: 'كواليس الفعاليات، الريلز التفاعلية، ومقتطفات أنشطة الطلاب في الحرم الجامعي.',
    requiredWaitSeconds: 5,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    nameAr: 'حساب تيك توك الرسمي',
    url: 'https://www.tiktok.com/@gdgoc.hnu',
    iconType: 'tiktok',
    brandColor: '#00F2FE',
    gradient: 'linear-gradient(135deg, #000000 0%, #00F2FE 50%, #FE0979 100%)',
    actionText: 'Follow on TikTok',
    actionTextAr: 'متابعة حساب تيك توك 🎵',
    description: 'Quick developer tips, hackathon recaps, and bite-sized tech content.',
    descriptionAr: 'نصائح برمجية سريعة، تغطيات الهاكاثون، ومحتوى تقني خفيف وممتع.',
    requiredWaitSeconds: 5,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    nameAr: 'صفحة لينكد إن الرسمية',
    url: 'https://www.linkedin.com/company/gdgoc',
    iconType: 'linkedin',
    brandColor: '#0A66C2',
    gradient: 'linear-gradient(135deg, #0A66C2 0%, #004182 100%)',
    actionText: 'Follow on LinkedIn',
    actionTextAr: 'متابعة صفحة لينكد إن 💼',
    description: 'Professional networking, internship opportunities, and official accreditations.',
    descriptionAr: 'بناء شبكتك المهنية، فرص التدريب والتوظيف، ومشاركة الشهادات المعتمدة.',
    requiredWaitSeconds: 5,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Channel',
    nameAr: 'قناة الواتساب الرسمية',
    url: 'https://www.whatsapp.com/channel/0029VbDl0xN6rsQmhlG1T827',
    iconType: 'whatsapp',
    brandColor: '#25D366',
    gradient: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
    actionText: 'Join WhatsApp Channel',
    actionTextAr: 'الانضمام لقناة الواتساب 💬',
    description: 'Urgent task deadlines, instant session alerts, and direct chapter notifications.',
    descriptionAr: 'تنبيهات المواعيد العاجلة، روابط الجلسات المباشرة، والإشعارات الفورية.',
    requiredWaitSeconds: 5,
  },
];
