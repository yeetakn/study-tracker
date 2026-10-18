
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { getSettings, saveSetting } from '../db/database'

export type Language = 'tr' | 'en'

const LANGUAGE_SETTING_KEY = 'ui.language'

const translations = {
  tr: {
    'app.title': 'Çalışma Defteri',
    'app.subtitle': 'DERS TAKİP ALANI',
    'app.mainNavigation': 'Ana menü',
    'app.mobileNavigation': 'Mobil ana menü',
    'app.navGroup': 'ÇALIŞMA ALANI',
    'app.nav.overview': 'Genel Bakış',
    'app.nav.calendar': 'Takvim',
    'app.nav.reports': 'Raporlar',
    'app.nav.settings': 'Ayarlar / Yedekleme',
    'app.desc.overview': 'Çalışmalarının genel görünümü.',
    'app.desc.calendar': 'Günlerini seç, çalışmalarını kaydet.',
    'app.desc.reports': 'Çalışma geçmişini düzenli raporlara dönüştür.',
    'app.desc.settings': 'Verilerini yönet ve yedeklerini güvenle sakla.',
    'app.workspaceStatus': 'Kişisel çalışma alanı',
    'app.mottoTranslation': 'Hayat için öğreniyoruz.',
    'app.version': 'Çalışma Defteri · v1.0.0',
    'app.placeholderTitle': 'Bu alanı sıradaki aşamada oluşturacağız',
    'app.backToOverview': 'Genel bakışa dön',

    'settings.languageTitle': 'Dil tercihi',
    'settings.languageDescription':
      'Uygulamanın arayüz dilini seç. Tercihin kaydedilir.',
    'settings.languageLabel': 'Arayüz dili',
    'settings.languageTurkish': 'Türkçe',
    'settings.languageEnglish': 'İngilizce',

    
    'overview.personalWorkspace': 'KİŞİSEL ÇALIŞMA ALANIN',
    'overview.monthSummary': 'çalışma özeti',
    'overview.monthDescription': 'Çözdüğün soruları, çalıştığın dersleri ve son kayıtlarını buradan takip edebilirsin.',
    'overview.addRecord': 'Çalışma kaydı ekle',
    'overview.selectedMonthOnly': 'Yalnızca seçilen ay içindeki gerçek kayıtlar.',
    'overview.solvedQuestions': 'Çözülen soru',
    'overview.thisMonthTotal': 'Bu ay toplam',
    'overview.studyDays': 'Çalışılan gün',
    'overview.distinctDays': 'Kayıt bulunan farklı gün',
    'overview.studyRecords': 'Çalışma kaydı',
    'overview.recordsThisMonth': 'Bu ay oluşturulan kayıt',
    'overview.subjectDistribution': 'Derslere göre dağılım',
    'overview.monthQuestionCounts': 'çözülen soru sayıları',
    'overview.loading': 'Veriler yükleniyor…',
    'overview.noSubjectData': 'Henüz ders verisi yok',
    'overview.noSubjectDataDescription': 'Kayıt ekledikçe ders bazındaki soru dağılımı burada görünecek.',
    'overview.uncategorized': 'Kategorisiz',
    'overview.topTopics': 'En çok çalışılan konular',
    'overview.topicQuestionCounts': 'Bu ay konu bazında çözülen sorular',
    'overview.noTopicData': 'Henüz konu verisi yok',
    'overview.noTopicDataDescription': 'Çalışma konuların kaydedildikçe burada listelenecek.',
    'overview.unknownSubject': 'Bilinmeyen ders',
    'overview.question': 'soru',
    'overview.lastSevenDays': 'Son 7 günlük çalışma',
    'overview.dailyQuestionCounts': 'Günlere göre çözülen soru sayısı',
    'overview.today': 'Bugün',
    'overview.recentStudies': 'Son çalışmalar',
    'overview.latestRecords': 'En son kaydedilen çalışma kayıtların',
    'overview.openCalendar': 'Takvimi aç',
    'overview.noRecords': 'Henüz çalışma kaydı yok',
    'overview.noRecordsDescription': 'Takvimden bir gün seçip ilk kaydını eklediğinde geçmişin burada görünecek.',
    'overview.loadError': 'Çalışma verileri yüklenemedi.',

    'calendar.title': 'Çalışma takvimi',
'calendar.subtitle': 'Bir gün seç, çalışmalarını kaydet ve geçmişini düzenle.',
'calendar.monthlyView': 'AYLIK GÖRÜNÜM',
'calendar.previousMonth': 'Önceki ay',
'calendar.nextMonth': 'Sonraki ay',
'calendar.hasRecords': 'çalışma kaydı var',
'calendar.selectedDay': 'Seçili gün',
'calendar.today': 'Bugün',
'calendar.dayWithRecords': 'Kayıt bulunan gün',
'calendar.selectedDate': 'SEÇİLİ TARİH',
'calendar.dailyStudy': 'Günlük çalışma',
'calendar.loadingRecords': 'Kayıtlar yükleniyor…',
'calendar.recordSingular': 'kayıt',
'calendar.recordPlural': 'kayıt',
'calendar.addRecord': 'Kayıt ekle',
'calendar.noRecords': 'Henüz kayıt bulunmuyor',
'calendar.addFirstRecord': 'Bu güne ait ilk çalışma kaydını ekleyebilirsin.',
'calendar.correct': 'Doğru',
'calendar.incorrect': 'Yanlış',
'calendar.blank': 'Boş',
'calendar.questions': 'soru',
'calendar.edit': 'Düzenle',
'calendar.delete': 'Sil',
'calendar.localStorageNotice': 'Kayıtlar bu tarayıcıda, bilgisayarında saklanır. Düzenli yedek almayı unutma.',
'calendar.updateSuccess': 'Çalışma kaydı güncellendi.',
'calendar.addSuccess': 'Çalışma kaydı başarıyla eklendi.',
'calendar.deleteConfirmPrefix': '"',
'calendar.deleteConfirmSuffix': '" çalışma kaydı silinsin mi? Bu işlem geri alınamaz.',
'calendar.deleteSuccess': 'Çalışma kaydı silindi.',
'calendar.unknownSubject': 'Bilinmeyen ders',
'calendar.uncategorized': 'Kategorisiz',
'calendar.genericError': 'İşlem tamamlanamadı. Lütfen tekrar dene.',


'recordForm.editTitle': 'Kaydı düzenle',
'recordForm.newTitle': 'Yeni çalışma kaydı',
'recordForm.description': 'Alanları doldurup çalışmanı kaydet.',
'recordForm.closeForm': 'Formu kapat',
'recordForm.date': 'Çalışma tarihi',
'recordForm.category': 'Kategori',
'recordForm.uncategorized': 'Kategorisiz',
'recordForm.subject': 'Ders',
'recordForm.noSubjectsInCategory': 'Bu kategoride ders yok',
'recordForm.selectSubject': 'Ders seç',
'recordForm.topic': 'Konu',
'recordForm.topicPlaceholder': 'Örn. Problemler',
'recordForm.source': 'Kaynak / test adı',
'recordForm.sourcePlaceholder': 'Örn. Deneme 4, Test 12',
'recordForm.questionCount': 'Çözülen soru sayısı',
'recordForm.questionCountPlaceholder': 'Örn. 40',
'recordForm.resultDistribution': 'Sonuç dağılımı',
'recordForm.optional': 'isteğe bağlı',
'recordForm.correctCount': 'Doğru',
'recordForm.incorrectCount': 'Yanlış',
'recordForm.blankCount': 'Boş',
'recordForm.notes': 'Notlar',
'recordForm.notesPlaceholder': 'Çalışmayla ilgili kısa not...',
'recordForm.cancel': 'Vazgeç',
'recordForm.saving': 'Kaydediliyor…',
'recordForm.saveChanges': 'Değişiklikleri kaydet',
'recordForm.saveRecord': 'Kaydı kaydet',
'recordForm.invalidCount': '{field} negatif olmayan bir tam sayı olmalıdır.',
'recordForm.dateRequired': 'Çalışma tarihi seçmelisin.',
'recordForm.subjectRequired': 'Önce Ayarlar bölümünden bir ders oluşturmalısın.',
'recordForm.topicRequired': 'Çalışılan konuyu girmelisin.',
'recordForm.questionCountRequired': 'Çözülen soru sayısını girmelisin.',
'recordForm.invalidQuestionCount': 'Çözülen soru sayısı negatif olmayan bir tam sayı olmalıdır.',
'recordForm.distributionExceedsTotal': 'Doğru, yanlış ve boş sayılarının toplamı çözülen soru sayısını aşamaz.',
'recordForm.saveFailed': 'Kayıt kaydedilemedi. Tekrar deneyebilirsin.',


'reports.titleDaily': 'Günlük Çalışma Raporu',
'reports.titleWeekly': 'Haftalık Çalışma Raporu',
'reports.titleFortnightly': 'İki Haftalık Çalışma Raporu',
'reports.titleMonthly': 'Aylık Çalışma Raporu',
'reports.titleCustom': 'Çalışma Raporu',
'reports.invalidRange': 'Başlangıç tarihi bitiş tarihinden sonra olamaz.',
'reports.invalidDateRange': 'Geçersiz tarih aralığı',
'reports.selectValidRange': 'Geçerli bir başlangıç ve bitiş tarihi seç.',
'reports.genericError': 'İşlem tamamlanamadı. Lütfen tekrar dene.',
'reports.uncategorized': 'Kategorisiz',
'reports.unknownSubject': 'Bilinmeyen ders',
'reports.dateRange': 'Tarih aralığı',
'reports.generatedDate': 'Rapor tarihi',
'reports.totalQuestions': 'Toplam soru',
'reports.subjectCount': 'Ders sayısı',
'reports.recordCount': 'Çalışma kaydı',
'reports.studyDays': 'Çalışılan gün',
'reports.subjectSummary': 'Ders bazında soru özeti',
'reports.subject': 'Ders',
'reports.category': 'Kategori',
'reports.questions': 'Soru',
'reports.detailedRecords': 'Ayrıntılı çalışma kayıtları',
'reports.date': 'Tarih',
'reports.topicSource': 'Konu / kaynak',
'reports.correct': 'Doğru',
'reports.incorrect': 'Yanlış',
'reports.blank': 'Boş',
'reports.notes': 'Notlar',
'reports.source': 'Kaynak',
'reports.noRecordsInRange': 'Seçilen tarih aralığında kayıt bulunmuyor.',
'reports.appName': 'Çalışma Defteri',
'reports.pdfSuccess': 'PDF raporu oluşturuldu ve indirme başlatıldı.',
'reports.pageTitle': 'PDF raporları',
'reports.pageDescription': 'Çalışma geçmişini seçtiğin tarih aralığı için önizle ve PDF olarak kaydet.',
'reports.settingsTitle': 'Rapor ayarları',
'reports.settingsDescription': 'Hafta pazartesi başlar. Özel aralıkta başlangıç ve bitiş tarihlerini kendin belirleyebilirsin.',
'reports.reportType': 'Rapor türü',
'reports.daily': 'Günlük',
'reports.weekly': 'Haftalık',
'reports.fortnightly': 'İki haftalık',
'reports.monthly': 'Aylık',
'reports.custom': 'Özel tarih aralığı',
'reports.startDate': 'Başlangıç tarihi',
'reports.endDate': 'Bitiş tarihi',
'reports.includeNotes': 'PDF ayrıntılı tablosuna çalışma notlarını ekle.',
'reports.generating': 'PDF hazırlanıyor…',
'reports.downloadPdf': 'PDF oluştur ve indir',
'reports.backToCalendar': 'Takvime dön',
'reports.loadingRecords': 'Kayıtlar yükleniyor…',
'reports.recordsFound': 'kayıt bulundu',
'reports.preview': 'PDF ÖNİZLEMESİ',
'reports.subjectTotals': 'Ders toplamları',
'reports.detailDescription': 'Tarih, kategori, ders, konu ve soru dağılımı',
'reports.rows': 'satır',
'reports.noDetailedRecords': 'Bu aralıkta ayrıntılı olarak gösterilecek kayıt yok.',
'reports.previewNotice1': 'Bu önizleme gerçek yerel çalışma kayıtlarından oluşturuluyor.',
'reports.previewNotice2': 'PDF sayfa düzeni ve sayfa numaraları indirme sırasında uygulanır.',

  },

  en: {
    'app.title': 'Study Tracker',
    'app.subtitle': 'STUDY TRACKER',
    'app.mainNavigation': 'Main navigation',
    'app.mobileNavigation': 'Mobile navigation',
    'app.navGroup': 'WORKSPACE',
    'app.nav.overview': 'Overview',
    'app.nav.calendar': 'Calendar',
    'app.nav.reports': 'Reports',
    'app.nav.settings': 'Settings / Backup',
    'app.desc.overview': 'An overview of your study activity.',
    'app.desc.calendar': 'Choose a day and record your study sessions.',
    'app.desc.reports': 'Turn your study history into organized reports.',
    'app.desc.settings': 'Manage your data and keep your backups safe.',
    'app.workspaceStatus': 'Personal workspace',
    'app.mottoTranslation': 'We learn for life.',
    'app.version': 'Study Tracker · v1.0.0',
    'app.placeholderTitle': 'This section will be built in a later phase',
    'app.backToOverview': 'Back to overview',

    'settings.languageTitle': 'Language preference',
    'settings.languageDescription':
      'Choose the interface language. Your preference will be saved.',
    'settings.languageLabel': 'Interface language',
    'settings.languageTurkish': 'Turkish',
    'settings.languageEnglish': 'English',

    
    'overview.personalWorkspace': 'PERSONAL STUDY SPACE',
    'overview.monthSummary': 'study summary',
    'overview.monthDescription': 'Track your solved questions, studied subjects, and recent records here.',
    'overview.addRecord': 'Add study record',
    'overview.selectedMonthOnly': 'Only actual records from the selected month.',
    'overview.solvedQuestions': 'Questions solved',
    'overview.thisMonthTotal': 'Total this month',
    'overview.studyDays': 'Study days',
    'overview.distinctDays': 'Different days with records',
    'overview.studyRecords': 'Study records',
    'overview.recordsThisMonth': 'Records created this month',
    'overview.subjectDistribution': 'Questions by subject',
    'overview.monthQuestionCounts': 'questions solved in',
    'overview.loading': 'Loading data…',
    'overview.noSubjectData': 'No subject data yet',
    'overview.noSubjectDataDescription': 'Question distribution by subject will appear here as you add records.',
    'overview.uncategorized': 'Uncategorized',
    'overview.topTopics': 'Most studied topics',
    'overview.topicQuestionCounts': 'Questions solved by topic this month',
    'overview.noTopicData': 'No topic data yet',
    'overview.noTopicDataDescription': 'Your topics will appear here as you save study records.',
    'overview.unknownSubject': 'Unknown subject',
    'overview.question': 'questions',
    'overview.lastSevenDays': 'Last 7 days',
    'overview.dailyQuestionCounts': 'Questions solved by day',
    'overview.today': 'Today',
    'overview.recentStudies': 'Recent activity',
    'overview.latestRecords': 'Your most recently saved study records',
    'overview.openCalendar': 'Open calendar',
    'overview.noRecords': 'No study records yet',
    'overview.noRecordsDescription': 'Choose a day in the calendar and add your first record to see your history here.',
    'overview.loadError': 'Failed to load study data.',

    'calendar.title': 'Study calendar',
'calendar.subtitle': 'Choose a day, record your study sessions, and review your history.',
'calendar.monthlyView': 'MONTHLY VIEW',
'calendar.previousMonth': 'Previous month',
'calendar.nextMonth': 'Next month',
'calendar.hasRecords': 'has a study record',
'calendar.selectedDay': 'Selected day',
'calendar.today': 'Today',
'calendar.dayWithRecords': 'Day with records',
'calendar.selectedDate': 'SELECTED DATE',
'calendar.dailyStudy': 'Daily study',
'calendar.loadingRecords': 'Loading records…',
'calendar.recordSingular': 'record',
'calendar.recordPlural': 'records',
'calendar.addRecord': 'Add record',
'calendar.noRecords': 'No records yet',
'calendar.addFirstRecord': 'You can add the first study record for this day.',
'calendar.correct': 'Correct',
'calendar.incorrect': 'Incorrect',
'calendar.blank': 'Blank',
'calendar.questions': 'questions',
'calendar.edit': 'Edit',
'calendar.delete': 'Delete',
'calendar.localStorageNotice': 'Your records are stored locally in this browser. Remember to back up your data regularly.',
'calendar.updateSuccess': 'Study record updated.',
'calendar.addSuccess': 'Study record added successfully.',
'calendar.deleteConfirmPrefix': 'Delete the study record "',
'calendar.deleteConfirmSuffix': '"? This action cannot be undone.',
'calendar.deleteSuccess': 'Study record deleted.',
'calendar.unknownSubject': 'Unknown subject',
'calendar.uncategorized': 'Uncategorized',
'calendar.genericError': 'The operation could not be completed. Please try again.',


'recordForm.editTitle': 'Edit record',
'recordForm.newTitle': 'New study record',
'recordForm.description': 'Fill in the fields and save your study session.',
'recordForm.closeForm': 'Close form',
'recordForm.date': 'Study date',
'recordForm.category': 'Category',
'recordForm.uncategorized': 'Uncategorized',
'recordForm.subject': 'Subject',
'recordForm.noSubjectsInCategory': 'No subjects in this category',
'recordForm.selectSubject': 'Select a subject',
'recordForm.topic': 'Topic',
'recordForm.topicPlaceholder': 'e.g. Problems',
'recordForm.source': 'Source / test name',
'recordForm.sourcePlaceholder': 'e.g. Mock exam 4, Test 12',
'recordForm.questionCount': 'Questions solved',
'recordForm.questionCountPlaceholder': 'e.g. 40',
'recordForm.resultDistribution': 'Results breakdown',
'recordForm.optional': 'optional',
'recordForm.correctCount': 'Correct',
'recordForm.incorrectCount': 'Incorrect',
'recordForm.blankCount': 'Blank',
'recordForm.notes': 'Notes',
'recordForm.notesPlaceholder': 'A short note about this study session...',
'recordForm.cancel': 'Cancel',
'recordForm.saving': 'Saving…',
'recordForm.saveChanges': 'Save changes',
'recordForm.saveRecord': 'Save record',
'recordForm.invalidCount': '{field} must be a non-negative integer.',
'recordForm.dateRequired': 'Please select a study date.',
'recordForm.subjectRequired': 'Please create a subject in Settings first.',
'recordForm.topicRequired': 'Please enter the topic you studied.',
'recordForm.questionCountRequired': 'Please enter the number of questions solved.',
'recordForm.invalidQuestionCount': 'The question count must be a non-negative integer.',
'recordForm.distributionExceedsTotal': 'The sum of correct, incorrect, and blank answers cannot exceed the total questions solved.',
'recordForm.saveFailed': 'The record could not be saved. Please try again.',


'reports.titleDaily': 'Daily Study Report',
'reports.titleWeekly': 'Weekly Study Report',
'reports.titleFortnightly': 'Two-Week Study Report',
'reports.titleMonthly': 'Monthly Study Report',
'reports.titleCustom': 'Study Report',
'reports.invalidRange': 'The start date cannot be later than the end date.',
'reports.invalidDateRange': 'Invalid date range',
'reports.selectValidRange': 'Select a valid start and end date.',
'reports.genericError': 'The operation could not be completed. Please try again.',
'reports.uncategorized': 'Uncategorized',
'reports.unknownSubject': 'Unknown subject',
'reports.dateRange': 'Date range',
'reports.generatedDate': 'Report date',
'reports.totalQuestions': 'Total questions',
'reports.subjectCount': 'Subjects',
'reports.recordCount': 'Study records',
'reports.studyDays': 'Study days',
'reports.subjectSummary': 'Questions by subject',
'reports.subject': 'Subject',
'reports.category': 'Category',
'reports.questions': 'Questions',
'reports.detailedRecords': 'Detailed study records',
'reports.date': 'Date',
'reports.topicSource': 'Topic / source',
'reports.correct': 'Correct',
'reports.incorrect': 'Incorrect',
'reports.blank': 'Blank',
'reports.notes': 'Notes',
'reports.source': 'Source',
'reports.noRecordsInRange': 'No records found in the selected date range.',
'reports.appName': 'Study Tracker',
'reports.pdfSuccess': 'PDF report created and download started.',
'reports.pageTitle': 'PDF Reports',
'reports.pageDescription': 'Preview your study history for a selected date range and save it as a PDF.',
'reports.settingsTitle': 'Report settings',
'reports.settingsDescription': 'Weeks start on Monday. You can choose the start and end dates for a custom range.',
'reports.reportType': 'Report type',
'reports.daily': 'Daily',
'reports.weekly': 'Weekly',
'reports.fortnightly': 'Two weeks',
'reports.monthly': 'Monthly',
'reports.custom': 'Custom date range',
'reports.startDate': 'Start date',
'reports.endDate': 'End date',
'reports.includeNotes': 'Include study notes in the detailed PDF table.',
'reports.generating': 'Generating PDF…',
'reports.downloadPdf': 'Create and download PDF',
'reports.backToCalendar': 'Back to calendar',
'reports.loadingRecords': 'Loading records…',
'reports.recordsFound': 'records found',
'reports.preview': 'PDF PREVIEW',
'reports.subjectTotals': 'Subject totals',
'reports.detailDescription': 'Date, category, subject, topic, and question breakdown',
'reports.rows': 'rows',
'reports.noDetailedRecords': 'No detailed records to display in this range.',
'reports.previewNotice1': 'This preview is generated from your actual local study records.',
'reports.previewNotice2': 'PDF page layout and page numbers are applied when downloading.',

  },
} as const

export type TranslationKey = keyof typeof translations.tr

interface I18nContextValue {
  language: Language
  isLanguageLoaded: boolean
  setLanguage: (language: Language) => Promise<void>
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [isLanguageLoaded, setIsLanguageLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadLanguage() {
      try {
        const settings = await getSettings()
        const storedLanguage = settings.find(
          (setting) => setting.key === LANGUAGE_SETTING_KEY,
        )?.value

        const detectedLanguage: Language =
          typeof navigator !== 'undefined' &&
          navigator.language.toLowerCase().startsWith('tr')
            ? 'tr'
            : 'en'

        const nextLanguage: Language =
          storedLanguage === 'tr' || storedLanguage === 'en'
            ? storedLanguage
            : detectedLanguage

        if (!cancelled) {
          setLanguageState(nextLanguage)

          // Persist the first automatic choice so later system-language changes
          // do not override a language the user has already been shown.
          if (storedLanguage !== 'tr' && storedLanguage !== 'en') {
            try {
              await saveSetting(LANGUAGE_SETTING_KEY, nextLanguage)
            } catch (error) {
              console.error('Dil tercihi kaydedilemedi.', error)
            }
          }
        }
      } catch (error) {
        console.error('Dil tercihi yüklenemedi.', error)
      } finally {
        if (!cancelled) {
          setIsLanguageLoaded(true)
        }
      }
    }

    void loadLanguage()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const setLanguage = useCallback(async (nextLanguage: Language) => {
    try {
      await saveSetting(LANGUAGE_SETTING_KEY, nextLanguage)
      setLanguageState(nextLanguage)
    } catch (error) {
      console.error('Dil tercihi kaydedilemedi.', error)
    }
  }, [])

  const t = useCallback(
    (key: TranslationKey) => translations[language][key],
    [language],
  )

  const contextValue = useMemo(
    () => ({
      language,
      isLanguageLoaded,
      setLanguage,
      t,
    }),
    [language, isLanguageLoaded, setLanguage, t],
  )

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n, I18nProvider içinde kullanılmalıdır.')
  }

  return context
}
