// Translation support for the application

export type Language = 'en' | 'hi' | 'pa';

export interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
}

export const languages: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
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
    hi: 'होम',
    pa: 'ਘਰ',
  },
  'settings': {
    en: 'Settings',
    hi: 'सेटिंग्स',
    pa: 'ਸੈਟਿੰਗਾਂ',
  },
  // Navigation translations
  'nav.home': {
    en: 'Home',
    hi: 'होम',
    pa: 'ਘਰ',
  },
  'nav.institute_info': {
    en: 'Institute Info',
    hi: 'संस्थान जानकारी',
    pa: 'ਇੰਸਟੀਚਿਊਟ ਜਾਣਕਾਰੀ',
  },
  'nav.admin_roles': {
    en: 'Admin Role Management',
    hi: 'एडमिन भूमिका प्रबंधन',
    pa: 'ਐਡਮਿਨ ਭੂਮਿਕਾ ਪ੍ਰਬੰਧਨ',
  },
  'nav.password': {
    en: 'Password Manager',
    hi: 'पासवर्ड प्रबंधक',
    pa: 'ਪਾਸਵਰਡ ਪ੍ਰਬੰਧਕ',
  },
  'nav.staff_management': {
    en: 'Staff Management',
    hi: 'स्टाफ प्रबंधन',
    pa: 'ਸਟਾਫ ਪ੍ਰਬੰਧਨ',
  },
  'nav.classes': {
    en: 'Classes',
    hi: 'कक्षाएं',
    pa: 'ਕਲਾਸਾਂ',
  },
  'nav.students': {
    en: 'Students',
    hi: 'छात्र',
    pa: 'ਵਿਦਿਆਰਥੀ',
  },
  'nav.timetable': {
    en: 'Timetable',
    hi: 'समय सारणी',
    pa: 'ਟਾਈਮਟੇਬਲ',
  },
  'nav.calendar': {
    en: 'Calendar',
    hi: 'कैलेंडर',
    pa: 'ਕੈਲੰਡਰ',
  },
  'nav.report_card': {
    en: 'Report Card',
    hi: 'रिपोर्ट कार्ड',
    pa: 'ਰਿਪੋਰਟ ਕਾਰਡ',
  },
  'nav.examinations': {
    en: 'Examinations',
    hi: 'परीक्षाएं',
    pa: 'ਪ੍ਰੀਖਿਆਵਾਂ',
  },
  'nav.fees': {
    en: 'Fees',
    hi: 'फीस',
    pa: 'ਫੀਸ',
  },
  'nav.library': {
    en: 'Library',
    hi: 'पुस्तकालय',
    pa: 'ਲਾਇਬ੍ਰੇਰੀ',
  },
  'nav.transport': {
    en: 'Transport',
    hi: 'परिवहन',
    pa: 'ਆਵਾਜਾਈ',
  },
  'nav.communication': {
    en: 'Communication',
    hi: 'संचार',
    pa: 'ਸੰਚਾਰ',
  },
  'nav.reports': {
    en: 'Reports',
    hi: 'रिपोर्ट',
    pa: 'ਰਿਪੋਰਟਾਂ',
  },
  'nav.settings': {
    en: 'Settings',
    hi: 'सेटिंग्स',
    pa: 'ਸੈਟਿੰਗਾਂ',
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
