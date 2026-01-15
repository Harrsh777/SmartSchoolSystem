// Translation support for the application

export type Language = 'en' | 'es' | 'fr' | 'de' | 'hi' | 'zh' | 'ja' | 'ar';

export interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
}

export const languages: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
];

// Translation keys (can be expanded as needed)
interface Translations {
  [key: string]: {
    [lang in Language]?: string;
  };
}

// Simple translations object (can be expanded)
const translations: Translations = {
  'home': {
    en: 'Home',
    es: 'Inicio',
    fr: 'Accueil',
    de: 'Startseite',
    hi: 'होम',
    zh: '首页',
    ja: 'ホーム',
    ar: 'الرئيسية',
  },
  'settings': {
    en: 'Settings',
    es: 'Configuración',
    fr: 'Paramètres',
    de: 'Einstellungen',
    hi: 'सेटिंग्स',
    zh: '设置',
    ja: '設定',
    ar: 'الإعدادات',
  },
  // Navigation translations
  'nav.home': {
    en: 'Home',
    es: 'Inicio',
    fr: 'Accueil',
    de: 'Startseite',
    hi: 'होम',
    zh: '首页',
    ja: 'ホーム',
    ar: 'الرئيسية',
  },
  'nav.institute_info': {
    en: 'Institute Info',
    es: 'Información del Instituto',
    fr: 'Informations de l\'Institut',
    de: 'Institutsinformationen',
    hi: 'संस्थान जानकारी',
    zh: '学院信息',
    ja: '学院情報',
    ar: 'معلومات المعهد',
  },
  'nav.admin_roles': {
    en: 'Admin Role Management',
    es: 'Gestión de Roles de Administrador',
    fr: 'Gestion des Rôles Admin',
    de: 'Admin-Rollenverwaltung',
    hi: 'एडमिन भूमिका प्रबंधन',
    zh: '管理员角色管理',
    ja: '管理者役割管理',
    ar: 'إدارة أدوار المشرف',
  },
  'nav.password': {
    en: 'Password Manager',
    es: 'Administrador de Contraseñas',
    fr: 'Gestionnaire de Mots de Passe',
    de: 'Passwort-Manager',
    hi: 'पासवर्ड प्रबंधक',
    zh: '密码管理器',
    ja: 'パスワードマネージャー',
    ar: 'مدير كلمة المرور',
  },
  'nav.staff_management': {
    en: 'Staff Management',
    es: 'Gestión de Personal',
    fr: 'Gestion du Personnel',
    de: 'Personalverwaltung',
    hi: 'स्टाफ प्रबंधन',
    zh: '员工管理',
    ja: 'スタッフ管理',
    ar: 'إدارة الموظفين',
  },
  'nav.classes': {
    en: 'Classes',
    es: 'Clases',
    fr: 'Classes',
    de: 'Klassen',
    hi: 'कक्षाएं',
    zh: '班级',
    ja: 'クラス',
    ar: 'الفصول',
  },
  'nav.students': {
    en: 'Students',
    es: 'Estudiantes',
    fr: 'Étudiants',
    de: 'Schüler',
    hi: 'छात्र',
    zh: '学生',
    ja: '学生',
    ar: 'الطلاب',
  },
  'nav.timetable': {
    en: 'Timetable',
    es: 'Horario',
    fr: 'Emploi du Temps',
    de: 'Stundenplan',
    hi: 'समय सारणी',
    zh: '时间表',
    ja: '時間割',
    ar: 'الجدول الزمني',
  },
  'nav.calendar': {
    en: 'Calendar',
    es: 'Calendario',
    fr: 'Calendrier',
    de: 'Kalender',
    hi: 'कैलेंडर',
    zh: '日历',
    ja: 'カレンダー',
    ar: 'التقويم',
  },
  'nav.examinations': {
    en: 'Examinations',
    es: 'Exámenes',
    fr: 'Examens',
    de: 'Prüfungen',
    hi: 'परीक्षाएं',
    zh: '考试',
    ja: '試験',
    ar: 'الامتحانات',
  },
  'nav.fees': {
    en: 'Fees',
    es: 'Tarifas',
    fr: 'Frais',
    de: 'Gebühren',
    hi: 'फीस',
    zh: '费用',
    ja: '料金',
    ar: 'الرسوم',
  },
  'nav.library': {
    en: 'Library',
    es: 'Biblioteca',
    fr: 'Bibliothèque',
    de: 'Bibliothek',
    hi: 'पुस्तकालय',
    zh: '图书馆',
    ja: '図書館',
    ar: 'المكتبة',
  },
  'nav.transport': {
    en: 'Transport',
    es: 'Transporte',
    fr: 'Transport',
    de: 'Transport',
    hi: 'परिवहन',
    zh: '交通',
    ja: '交通',
    ar: 'النقل',
  },
  'nav.communication': {
    en: 'Communication',
    es: 'Comunicación',
    fr: 'Communication',
    de: 'Kommunikation',
    hi: 'संचार',
    zh: '通信',
    ja: 'コミュニケーション',
    ar: 'الاتصال',
  },
  'nav.reports': {
    en: 'Reports',
    es: 'Informes',
    fr: 'Rapports',
    de: 'Berichte',
    hi: 'रिपोर्ट',
    zh: '报告',
    ja: 'レポート',
    ar: 'التقارير',
  },
  'nav.settings': {
    en: 'Settings',
    es: 'Configuración',
    fr: 'Paramètres',
    de: 'Einstellungen',
    hi: 'सेटिंग्स',
    zh: '设置',
    ja: '設定',
    ar: 'الإعدادات',
  },
  // Add more translations as needed
};

/**
 * Get translation for a key in the specified language
 * Falls back to English if translation not available
 */
export function getTranslation(key: string, language: Language = 'en'): string {
  const translation = translations[key]?.[language] || translations[key]?.['en'] || key;
  return translation;
}
