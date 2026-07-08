import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zhTW from './locales/zh-TW.json';

const savedLang = localStorage.getItem('game-lang');
const defaultLang = (savedLang === 'en' || savedLang === 'zh-TW') 
  ? savedLang 
  : (navigator.language.startsWith('zh') ? 'zh-TW' : 'en');

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en
      },
      'zh-TW': {
        translation: zhTW
      }
    },
    lng: defaultLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
