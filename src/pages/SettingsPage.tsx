import { useI18n, type Language } from '../localization/i18n'
import { useEffect, useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import {
  BookOpen,
  Check,
  Download,
  FolderPlus,
  Pencil,
  Plus,
  Settings,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import {
  addCategory,
  addSubject,
  deleteCategory,
  deleteSubject,
  getCategories,
  getSubjects,
  mergeBackupData,
  renameCategory,
  renameSubject,
  resetAllData,
  updateSubjectCategory,
} from '../db/database'
import type { Category, Subject } from '../types/study'
import { downloadBackup, readBackupFile } from '../services/backup'
import type { BackupImportResult } from '../types/backup'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#789f82] focus:ring-2 focus:ring-[#789f82]/15'
const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : (document.documentElement.lang === 'tr' ? 'İşlem tamamlanamadı. Lütfen tekrar dene.' : 'The operation could not be completed. Please try again.')
}

export default function SettingsPage() {
  const { language, isLanguageLoaded, setLanguage, t } = useI18n()
  const tr = language === 'tr'
  const copy = {
    pageTitle: tr ? 'Ayarlar ve veri yönetimi' : 'Settings and data management',
    pageDescription: tr ? 'Kategorilerini ve derslerini kendine göre düzenle; yedeklerini güvenle yönet.' : 'Organize your categories and subjects, and manage your backups safely.',
    categories: tr ? 'Kategoriler' : 'Categories',
    categoriesDescription: tr ? 'Derslerini kendi oluşturduğun gruplara ayır. Herhangi bir kategori oluşturmak zorunlu değil.' : 'Group your subjects as you like. Creating categories is optional.',
    newCategory: tr ? 'Yeni kategori adı' : 'New category name',
    addCategory: tr ? 'Kategori ekle' : 'Add category',
    categoriesLoading: tr ? 'Kategoriler yükleniyor…' : 'Loading categories…',
    noCategories: tr ? 'Henüz kategori oluşturulmadı. İstersen yukarıdan bir kategori oluşturabilir veya kategorisiz ders ekleyebilirsin.' : 'No categories yet. Create one above or add a subject without a category.',
    subjectCount: tr ? 'ders' : 'subjects',
    newCategoryLabel: tr ? 'Yeni kategori adı' : 'New category name',
    save: tr ? 'Kaydet' : 'Save', cancel: tr ? 'İptal' : 'Cancel',
    rename: tr ? 'Adını değiştir' : 'Rename', delete: tr ? 'Sil' : 'Delete',
    languageTitle: tr ? 'Dil tercihi' : 'Language preference',
    languageDescription: tr ? 'Uygulamanın arayüz dilini seç. Tercihin kaydedilir.' : 'Choose the interface language. Your preference is saved.',
    subjects: tr ? 'Dersler' : 'Subjects',
    subjectsDescription: tr ? 'Bir ders bir kategoriye bağlı olabilir veya kategorisiz kalabilir. Aynı kategori içinde yinelenen ders adlarına izin verilmez.' : 'A subject can belong to a category or remain uncategorized. Duplicate subject names within the same category are not allowed.',
    subjectName: tr ? 'Ders adı' : 'Subject name',
    subjectPlaceholder: tr ? 'Örn. İleri Matematik' : 'e.g. Advanced Mathematics',
    categoryOptional: tr ? 'Kategori (isteğe bağlı)' : 'Category (optional)',
    uncategorized: tr ? 'Kategorisiz' : 'Uncategorized',
    addSubject: tr ? 'Ders ekle' : 'Add subject',
    subjectsLoading: tr ? 'Dersler yükleniyor…' : 'Loading subjects…',
    noSubjects: tr ? 'Henüz ders eklenmemiş. Kendi derslerini yukarıdan oluşturabilirsin; TYT/AYT veya başka bir programa bağlı kalman gerekmiyor.' : 'No subjects yet. Add your own above; you are not limited to any particular exam system.',
    backup: tr ? 'Veri yedekleme' : 'Data backup',
    backupDescription: tr ? 'Kategorilerini, derslerini, çalışma kayıtlarını ve ayarlarını JSON dosyası olarak sakla veya bir yedeği geri yükle.' : 'Export your categories, subjects, study records, and settings to a JSON file, or restore a backup.',
    busy: tr ? 'İşlem sürüyor…' : 'Working…', downloadBackup: tr ? 'JSON yedeği indir' : 'Download JSON backup',
    restoreBackup: tr ? 'Yedekten geri yükle' : 'Restore from backup',
    dataSafety: tr ? 'Veri güvenliği:' : 'Data safety:',
    dataSafetyDescription: tr ? 'Geri yükleme mevcut verilerini silmez. Aynı kimlikli çalışma kayıtları yeniden eklenmez. Uygulama, eski sürüm JSON yedeklerini de içe aktarabilir.' : 'Restoring does not delete existing data. Records with duplicate IDs are skipped. Older JSON backup formats are also supported.',
    danger: tr ? 'Tehlikeli alan' : 'Danger zone',
    dangerDescription: tr ? 'Bu işlem kategorileri, dersleri, çalışma kayıtlarını ve ayarları siler. Varsayılan ders veya kategori oluşturulmaz.' : 'This deletes categories, subjects, study records, and settings. No default subjects or categories will be created.',
    irreversible: tr ? 'Bu işlem geri alınamaz. Önce JSON yedeği al.' : 'This action cannot be undone. Create a JSON backup first.',
    reset: tr ? 'Tüm verileri sıfırla' : 'Reset all data',
    localData: tr ? 'Yerel verilerin hakkında' : 'About your local data',
    localDataDescription: tr ? 'Derslerin ve çalışma kayıtların bu tarayıcının IndexedDB depolamasında tutulur. Tarayıcı verilerini temizlemek kayıtlarını silebilir. Düzenli olarak yedek almanı öneririz.' : 'Your subjects and study records are stored in this browser’s IndexedDB. Clearing browser data may delete them. We recommend making regular backups.',
  }
  const [categories, setCategories] = useState<Category[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectCategoryId, setNewSubjectCategoryId] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null)
  const [editingSubjectName, setEditingSubjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const backupInputRef = useRef<HTMLInputElement>(null)
  const [backupBusy, setBackupBusy] = useState(false)

  async function refreshData() {
    const [loadedCategories, loadedSubjects] = await Promise.all([
      getCategories(),
      getSubjects(),
    ])
    setCategories(loadedCategories)
    setSubjects(loadedSubjects)
    setNewSubjectCategoryId((current) =>
      current && loadedCategories.some((category) => category.id === current)
        ? current
        : '',
    )
  }

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        const [loadedCategories, loadedSubjects] = await Promise.all([
          getCategories(),
          getSubjects(),
        ])
        if (!cancelled) {
          setCategories(loadedCategories)
          setSubjects(loadedSubjects)
        }
      } catch (caught) {
        if (!cancelled) setError(getErrorMessage(caught))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadData()
    return () => { cancelled = true }
  }, [])

  async function handleAddCategory(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const category = await addCategory(newCategoryName)
      await refreshData()
      setNewCategoryName('')
      setNewSubjectCategoryId(category.id)
      setMessage(tr ? `"${category.name}" kategorisi oluşturuldu.` : `Category "${category.name}" created.`)
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  async function handleRenameCategory(category: Category) {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await renameCategory(category.id, editingCategoryName)
      await refreshData()
      setEditingCategoryId(null)
      setEditingCategoryName('')
      setMessage(tr ? 'Kategori adı güncellendi.' : 'Category name updated.')
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteCategory(category: Category) {
    const attachedCount = subjects.filter((subject) => subject.categoryId === category.id).length
    const confirmed = window.confirm(
      (tr ? `"${category.name}" kategorisi silinsin mi?\n\n` : `Delete category "${category.name}"?\n\n`) +
      (attachedCount > 0
        ? (tr ? `${attachedCount} ders silinmeyecek; kategori olmadan bırakılacak. Çalışma geçmişi korunacak.` : `${attachedCount} subject(s) will remain and become uncategorized. Study history will be preserved.`)
        : (tr ? 'Bu kategoride ders yok.' : 'This category has no subjects.')),
    )
    if (!confirmed) return

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const movedCount = await deleteCategory(category.id)
      await refreshData()
      setMessage(tr ? `Kategori silindi. ${movedCount} ders kategorisiz bırakıldı; çalışma kayıtları korunuyor.` : `Category deleted. ${movedCount} subject(s) are now uncategorized; study records were preserved.`)
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  async function handleAddSubject(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await addSubject(newSubjectName, newSubjectCategoryId || undefined)
      await refreshData()
      setNewSubjectName('')
      setMessage(tr ? 'Ders oluşturuldu.' : 'Subject created.')
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  async function handleRenameSubject(subject: Subject) {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await renameSubject(subject.id, editingSubjectName)
      await refreshData()
      setEditingSubjectId(null)
      setEditingSubjectName('')
      setMessage(tr ? 'Ders adı güncellendi.' : 'Subject name updated.')
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  async function handleMoveSubject(subject: Subject, categoryId: string) {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await updateSubjectCategory(subject.id, categoryId || undefined)
      await refreshData()
      setMessage(tr ? `"${subject.name}" dersinin kategorisi güncellendi.` : `Category updated for subject "${subject.name}".`)
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteSubject(subject: Subject) {
    const confirmed = window.confirm(
      (tr ? `"${subject.name}" dersi silinsin mi?\n\n` : `Delete subject "${subject.name}"?\n\n`) +
      (tr ? 'Derse bağlı çalışma kayıtları varsa silme engellenir; geçmiş kayıtlar otomatik silinmez.' : 'Deletion is blocked if study records are linked to this subject; history is not automatically deleted.'),
    )
    if (!confirmed) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await deleteSubject(subject.id)
      await refreshData()
      setMessage(tr ? `"${subject.name}" dersi silindi.` : `Subject "${subject.name}" deleted.`)
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  async function handleDownloadBackup() {
    setBackupBusy(true)
    setError('')
    setMessage('')
    try {
      await downloadBackup()
      setMessage(tr ? 'JSON yedeği indirildi. Dosyayı güvenli bir yerde sakla.' : 'JSON backup downloaded. Store the file somewhere safe.')
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setBackupBusy(false)
    }
  }

  async function handleRestoreFile(file?: File) {
    if (!file) return
    setBackupBusy(true)
    setError('')
    setMessage('')
    try {
      const backup = await readBackupFile(file)
      const confirmed = window.confirm(
        `Yedek dosyası doğrulandı.\n\n` +
        `${tr ? 'Yedek tarihi' : 'Backup date'}: ${new Date(backup.createdAt).toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US')}\n` +
        `${tr ? 'Kategori' : 'Categories'}: ${backup.data.categories.length}\n` +
        `${tr ? 'Ders' : 'Subjects'}: ${backup.data.subjects.length}\n` +
        `${tr ? 'Çalışma kaydı' : 'Study records'}: ${backup.data.records.length}\n` +
        `${tr ? 'Ayar' : 'Settings'}: ${backup.data.settings.length}\n\n` +
        (tr ? 'Mevcut verilerin silinmeyecek. Yeni veriler eklenecek; aynı kimlikli kayıtlar tekrar eklenmeyecek. Devam edilsin mi?' : 'Existing data will not be deleted. New data will be added; records with duplicate IDs will be skipped. Continue?'),
      )
      if (!confirmed) return
      const result: BackupImportResult = await mergeBackupData(backup.data)
      await refreshData()
      setMessage(
        tr ? `Yedek içe aktarıldı. ${result.categoriesAdded} kategori, ${result.subjectsAdded} ders ve ${result.recordsAdded} çalışma kaydı eklendi; ${result.recordsSkipped} yinelenen kayıt atlandı.` : `Backup imported. Added ${result.categoriesAdded} categories, ${result.subjectsAdded} subjects, and ${result.recordsAdded} study records; skipped ${result.recordsSkipped} duplicates.`,
      )
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setBackupBusy(false)
    }
  }

  async function handleResetAllData() {
    const confirmed = window.confirm(
      (tr ? 'DİKKAT: Bütün kategoriler, dersler, çalışma kayıtları ve uygulama ayarları silinecek.\n\nİşlem geri alınamaz. Önce JSON yedeği aldığından emin ol. Devam etmek istiyor musun?' : 'WARNING: All categories, subjects, study records, and app settings will be deleted.\n\nThis cannot be undone. Make sure you have a JSON backup first. Continue?'),
    )
    if (!confirmed) return
    const confirmationText = window.prompt(tr ? 'Son onay için aşağıya tam olarak SIFIRLA yaz.' : 'For final confirmation, type RESET exactly below.')
    if (confirmationText !== (tr ? 'SIFIRLA' : 'RESET')) {
      if (confirmationText !== null) setMessage(tr ? 'Sıfırlama iptal edildi. Verilerin değiştirilmedi.' : 'Reset cancelled. Your data was not changed.')
      return
    }

    setBackupBusy(true)
    setError('')
    setMessage('')
    try {
      const deletedCount = await resetAllData()
      await refreshData()
      setNewCategoryName('')
      setNewSubjectName('')
      setEditingCategoryId(null)
      setEditingSubjectId(null)
      setMessage(tr ? `Sıfırlama tamamlandı. ${deletedCount} çalışma kaydı silindi. Kategoriler ve dersler boş bırakıldı.` : `Reset complete. Deleted ${deletedCount} study records. Categories and subjects are now empty.`)
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setBackupBusy(false)
    }
  }

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]))

  return (
    <div className="space-y-7">
      <section>
        <h2 className="text-base font-semibold text-slate-900">{copy.pageTitle}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {copy.pageDescription}
        </p>
      </section>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div role="status" className="rounded-xl border border-[#d5e5d8] bg-[#eef5ef] px-4 py-3 text-sm text-[#315b3d]">{message}</div>}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4ee] text-[#426b52]"><FolderPlus size={19} /></div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{copy.categories}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">{copy.categoriesDescription}</p>
          </div>
        </div>

        <form onSubmit={handleAddCategory} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder={copy.newCategory} maxLength={80} required className={inputClass} />
          <button type="submit" disabled={saving || !newCategoryName.trim()} className={`${buttonClass} shrink-0 bg-[#244b38] px-4 py-3 text-white hover:bg-[#193b2a]`}><Plus size={15} />{copy.addCategory}</button>
        </form>

        {loading ? <p className="mt-4 text-sm text-slate-500">{copy.categoriesLoading}</p> : categories.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs leading-5 text-slate-500">{copy.noCategories}</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {categories.map((category) => {
              const editing = editingCategoryId === category.id
              const count = subjects.filter((subject) => subject.categoryId === category.id).length
              return (
                <div key={category.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  {editing ? <input aria-label={copy.newCategoryLabel} autoFocus value={editingCategoryName} onChange={(event) => setEditingCategoryName(event.target.value)} maxLength={80} className={`min-w-0 flex-1 ${inputClass}`} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void handleRenameCategory(category) } if (event.key === 'Escape') setEditingCategoryId(null) }} /> : (
                    <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-800">{category.name}</p><p className="mt-0.5 text-[11px] text-slate-500">{count} {copy.subjectCount}</p></div>
                  )}
                  {editing ? <>
                    <button type="button" disabled={saving} onClick={() => void handleRenameCategory(category)} className={`${buttonClass} text-[#315b3d] hover:bg-[#edf4ee]`}><Check size={14} />{copy.save}</button>
                    <button type="button" onClick={() => { setEditingCategoryId(null); setEditingCategoryName('') }} className={`${buttonClass} text-slate-500 hover:bg-slate-100`}><X size={14} />{copy.cancel}</button>
                  </> : <>
                    <button type="button" disabled={saving} onClick={() => { setEditingCategoryId(category.id); setEditingCategoryName(category.name); setError(''); setMessage('') }} className={`${buttonClass} text-slate-600 hover:bg-slate-100`}><Pencil size={14} />{copy.rename}</button>
                    <button type="button" disabled={saving} onClick={() => void handleDeleteCategory(category)} className={`${buttonClass} text-red-600 hover:bg-red-50`}><Trash2 size={14} />{copy.delete}</button>
                  </>}
                </div>
              )
            })}
          </div>
        )}
      </section>


      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900">
            {t('settings.languageTitle')}
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {t('settings.languageDescription')}
          </p>
        </div>

        <div className="max-w-sm">
          <label
            htmlFor="interface-language"
            className="text-xs font-medium text-slate-700"
          >
            {t('settings.languageLabel')}
          </label>

          <select
            id="interface-language"
            value={language}
            disabled={!isLanguageLoaded}
            onChange={(event) =>
              void setLanguage(event.target.value as Language)
            }
            className={`${inputClass} mt-1.5`}
          >
            <option value="tr">{t('settings.languageTurkish')}</option>
            <option value="en">{t('settings.languageEnglish')}</option>
          </select>
        </div>
      </section>


      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4ee] text-[#426b52]"><BookOpen size={19} /></div>
          <div><h3 className="text-sm font-semibold text-slate-900">{copy.subjects}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{copy.subjectsDescription}</p></div>
        </div>

        <form onSubmit={handleAddSubject} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto] sm:items-end">
          <div><label htmlFor="new-subject-name" className="text-xs font-medium text-slate-700">{copy.subjectName}</label><input id="new-subject-name" value={newSubjectName} onChange={(event) => setNewSubjectName(event.target.value)} placeholder={copy.subjectPlaceholder} maxLength={80} required className={`${inputClass} mt-1.5`} /></div>
          <div><label htmlFor="new-subject-category" className="text-xs font-medium text-slate-700">{copy.categoryOptional}</label><select id="new-subject-category" value={newSubjectCategoryId} onChange={(event) => setNewSubjectCategoryId(event.target.value)} className={`${inputClass} mt-1.5`}><option value="">{copy.uncategorized}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
          <button type="submit" disabled={saving || !newSubjectName.trim()} className={`${buttonClass} bg-[#244b38] px-4 py-3 text-white hover:bg-[#193b2a]`}><Plus size={15} />{copy.addSubject}</button>
        </form>

        {loading ? <p className="mt-4 text-sm text-slate-500">{copy.subjectsLoading}</p> : subjects.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs leading-5 text-slate-500">{copy.noSubjects}</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {subjects.map((subject) => {
              const editing = editingSubjectId === subject.id
              return (
                <div key={subject.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500"><BookOpen size={17} /></div>
                  {editing ? <input aria-label={tr ? "Yeni ders adı" : "New subject name"} autoFocus value={editingSubjectName} onChange={(event) => setEditingSubjectName(event.target.value)} maxLength={80} className={`min-w-0 flex-1 ${inputClass}`} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void handleRenameSubject(subject) } if (event.key === 'Escape') setEditingSubjectId(null) }} /> : <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium text-slate-800">{subject.name}</p><p className="mt-0.5 text-[11px] text-slate-500">{subject.categoryId ? categoryNameById.get(subject.categoryId) ?? copy.uncategorized : copy.uncategorized}</p></div>}
                  {!editing && <select aria-label={tr ? `${subject.name} kategorisi` : `${subject.name} category`} disabled={saving} value={subject.categoryId ?? ''} onChange={(event) => void handleMoveSubject(subject, event.target.value)} className="max-w-48 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700"><option value="">{copy.uncategorized}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>}
                  {editing ? <>
                    <button type="button" disabled={saving} onClick={() => void handleRenameSubject(subject)} className={`${buttonClass} text-[#315b3d] hover:bg-[#edf4ee]`}><Check size={14} />{copy.save}</button>
                    <button type="button" onClick={() => { setEditingSubjectId(null); setEditingSubjectName('') }} className={`${buttonClass} text-slate-500 hover:bg-slate-100`}><X size={14} />{copy.cancel}</button>
                  </> : <>
                    <button type="button" disabled={saving} onClick={() => { setEditingSubjectId(subject.id); setEditingSubjectName(subject.name); setError(''); setMessage('') }} className={`${buttonClass} text-slate-600 hover:bg-slate-100`}><Pencil size={14} />{copy.rename}</button>
                    <button type="button" disabled={saving} onClick={() => void handleDeleteSubject(subject)} className={`${buttonClass} text-red-600 hover:bg-red-50`}><Trash2 size={14} />{copy.delete}</button>
                  </>}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4ee] text-[#426b52]"><Settings size={19} /></div><div><h3 className="text-sm font-semibold text-slate-900">{copy.backup}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{copy.backupDescription}</p></div></div>
        <input ref={backupInputRef} type="file" accept=".json,application/json" className="hidden" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file) void handleRestoreFile(file) }} />
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button type="button" disabled={backupBusy || saving} onClick={() => void handleDownloadBackup()} className={`${buttonClass} bg-[#244b38] px-4 py-3 text-white hover:bg-[#193b2a]`}><Download size={16} />{backupBusy ? copy.busy : copy.downloadBackup}</button>
          <button type="button" disabled={backupBusy || saving} onClick={() => backupInputRef.current?.click()} className={`${buttonClass} border border-slate-200 bg-white px-4 py-3 text-slate-700 hover:bg-slate-50`}><Upload size={16} />{copy.restoreBackup}</button>
        </div>
        <div className="mt-4 rounded-xl bg-[#fafbf9] px-4 py-3"><p className="text-xs leading-5 text-slate-600"><strong>{copy.dataSafety}</strong> {copy.dataSafetyDescription}</p></div>
      </section>

      <section className="rounded-2xl border border-red-200 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"><Trash2 size={19} /></div><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-slate-900">{copy.danger}</h3><p className="mt-2 text-xs leading-6 text-slate-500">{copy.dangerDescription}</p><p className="mt-2 text-xs font-medium text-red-700">{copy.irreversible}</p><button type="button" disabled={backupBusy || saving} onClick={() => void handleResetAllData()} className={`${buttonClass} mt-4 border border-red-200 bg-white px-4 py-2.5 text-red-700 hover:bg-red-50`}><Trash2 size={15} />{backupBusy ? copy.busy : copy.reset}</button></div></div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6"><div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Settings size={19} /></div><div><h3 className="text-sm font-semibold text-slate-900">{copy.localData}</h3><p className="mt-2 text-xs leading-6 text-slate-500">{copy.localDataDescription}</p></div></div></section>
    </div>
  )
}
