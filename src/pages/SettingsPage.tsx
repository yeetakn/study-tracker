import { useEffect, useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import {
  BookOpen,
  Check,
  Download,
  Pencil,
  Plus,
  Settings,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import {
  addSubject,
  deleteSubject,
  getSubjects,
  mergeBackupData,
  renameSubject,
  resetAllData,
} from '../db/database'
import type { ExamType, Subject } from '../types/study'
import { downloadBackup, readBackupFile } from '../services/backup'
import type { BackupImportResult } from '../types/backup'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#789f82] focus:ring-2 focus:ring-[#789f82]/15'

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'İşlem tamamlanamadı. Lütfen tekrar dene.'
}

export default function SettingsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [examType, setExamType] = useState<ExamType>('TYT')
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const backupInputRef = useRef<HTMLInputElement>(null)
  const [backupBusy, setBackupBusy] = useState(false)

  async function refreshSubjects() {
    const result = await getSubjects()
    setSubjects(result)
  }

  useEffect(() => {
    let cancelled = false

    async function loadSubjects() {
      try {
        const result = await getSubjects()
        if (!cancelled) setSubjects(result)
      } catch (caught) {
        if (!cancelled) setError(getErrorMessage(caught))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadSubjects()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleAdd(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      await addSubject(newName, examType)
      await refreshSubjects()
      setNewName('')
      setMessage(`${examType} dersi eklendi.`)
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  function startEditing(subject: Subject) {
    setEditingId(subject.id)
    setEditingName(subject.name)
    setError('')
    setMessage('')
  }

  async function handleRename(subject: Subject) {
    setSaving(true)
    setError('')
    setMessage('')

    try {
      await renameSubject(subject.id, editingName)
      await refreshSubjects()
      setEditingId(null)
      setEditingName('')
      setMessage(`"${subject.name}" dersinin adı güncellendi.`)
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setSaving(false)
    }
  }
  
  async function handleDeleteSubject(subject: Subject) {
  const confirmed = window.confirm(
    `"${subject.name}" dersini silmek istiyor musun?\n\n` +
      'Bağlı çalışma kayıtları varsa silme işlemi engellenecek.',
  )

  if (!confirmed) return

  setSaving(true)
  setError('')
  setMessage('')

  try {
    await deleteSubject(subject.id)
    await refreshSubjects()
    setMessage(`"${subject.name}" dersi silindi.`)
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
    setMessage('JSON yedeği indirildi. Dosyayı güvenli bir yerde sakla.')
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
        `Yedek tarihi: ${new Date(backup.createdAt).toLocaleString('tr-TR')}\n` +
        `Ders sayısı: ${backup.data.subjects.length}\n` +
        `Çalışma kaydı: ${backup.data.records.length}\n` +
        `Ayar sayısı: ${backup.data.settings.length}\n\n` +
        `Mevcut verilerin silinmeyecek. Yeni kayıtlar eklenecek; ` +
        `aynı ID'li çalışma kayıtları tekrar eklenmeyecek. Devam edilsin mi?`,
    )

    if (!confirmed) return

    const result: BackupImportResult = await mergeBackupData(backup.data)

    await refreshSubjects()

    setMessage(
      `Yedek içe aktarıldı. ` +
        `${result.subjectsAdded} ders eklendi, ` +
        `${result.recordsAdded} yeni kayıt eklendi, ` +
        `${result.recordsSkipped} yinelenen kayıt atlandı, ` +
        `${result.settingsAdded} yeni ayar eklendi.`,
    )
  } catch (caught) {
    setError(getErrorMessage(caught))
  } finally {
    setBackupBusy(false)
  }
}


async function handleResetAllData() {
  // Birinci onay
  const confirmed = window.confirm(
    'DİKKAT: Bu işlem bütün çalışma kayıtlarını ve uygulama ayarlarını silecek; özel derslerini kaldırıp varsayılan dersleri geri yükleyecek.\n\n' +
      'Bu işlem geri alınamaz. Önce JSON yedeği aldığından emin ol.\n\n' +
      'İlk onayı vermek istiyor musun?',
  )

  if (!confirmed) return

  // İkinci onay: kullanıcı belirli bir ifade yazmalı.
  const confirmationText = window.prompt(
    'Son onay için aşağıya tam olarak SIFIRLA yaz.\n\n' +
      'Başka bir ifade yazarsan veya pencereyi kapatırsan işlem yapılmaz.',
  )

  if (confirmationText !== 'SIFIRLA') {
    if (confirmationText !== null) {
      setMessage('Sıfırlama iptal edildi. Verilerin değiştirilmedi.')
    }

    return
  }

  setBackupBusy(true)
  setError('')
  setMessage('')

  try {
    const deletedCount = await resetAllData()

    await refreshSubjects()

    setNewName('')
    setEditingId(null)
    setEditingName('')

    setMessage(
      `Sıfırlama tamamlandı. ${deletedCount} çalışma kaydı silindi. ` +
        'Varsayılan TYT ve AYT dersleri yeniden oluşturuldu.',
    )
  } catch (caught) {
    setError(getErrorMessage(caught))
  } finally {
    setBackupBusy(false)
  }
}


  const tytSubjects = subjects.filter((subject) => subject.examType === 'TYT')
  const aytSubjects = subjects.filter((subject) => subject.examType === 'AYT')

  function renderSubjectList(
    title: string,
    type: ExamType,
    items: Subject[],
  ) {
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-[11px] text-slate-500">
              {items.length} ders
            </p>
          </div>
          <span className="rounded-lg bg-[#edf4ee] px-2.5 py-1.5 text-[10px] font-semibold text-[#315b3d]">
            {type}
          </span>
        </div>

        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-slate-500">
            Henüz ders eklenmemiş.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((subject) => {
              const editing = editingId === subject.id

              return (
                <div
                  key={subject.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3.5 sm:px-6"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                    <BookOpen size={17} />
                  </div>

                  {editing ? (
                    <>
                      <input
                        aria-label={`${subject.name} yeni ders adı`}
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        maxLength={80}
                        autoFocus
                        className={`min-w-0 flex-1 ${inputClass}`}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            void handleRename(subject)
                          }

                          if (event.key === 'Escape') {
                            setEditingId(null)
                            setEditingName('')
                          }
                        }}
                      />

                      <div className="ml-auto flex shrink-0 gap-1">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void handleRename(subject)}
                          aria-label="Ders adını kaydet"
                          className="flex size-9 items-center justify-center rounded-lg text-[#315b3d] hover:bg-[#edf4ee] disabled:opacity-50"
                        >
                          <Check size={17} />
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => {
                            setEditingId(null)
                            setEditingName('')
                          }}
                          aria-label="Düzenlemeyi iptal et"
                          className="flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                        >
                          <X size={17} />
                        </button>
                      </div>
                    </>

                  ) : (
                    <>
                      <span className="min-w-0 flex-1 break-words text-sm font-medium text-slate-800">
                        {subject.name}
                      </span>

                      <div className="ml-auto flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEditing(subject)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          <Pencil size={14} />
                          Adını değiştir
                        </button>

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void handleDeleteSubject(subject)}
                          aria-label={`${subject.name} dersini sil`}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                          Sil
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    )
  }

  return (
    <div className="space-y-7">
      <section>
        <h2 className="text-base font-semibold text-slate-900">
          Ayarlar ve veri yönetimi
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Derslerini düzenle ve çalışma alanını yönet.
        </p>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-xl border border-[#d5e5d8] bg-[#eef5ef] px-4 py-3 text-sm text-[#315b3d]"
        >
          {message}
        </div>
      )}


<input
  ref={backupInputRef}
  type="file"
  accept=".json,application/json"
  className="hidden"
  onChange={(event) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''

    if (file) void handleRestoreFile(file)
  }}
/>

<section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
  <div className="flex items-start gap-3">
    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4ee] text-[#426b52]">
      <Settings size={19} />
    </div>

    <div>
      <h3 className="text-sm font-semibold text-slate-900">
        Veri yedekleme
      </h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Derslerini, çalışma kayıtlarını ve ayarlarını JSON dosyası
        olarak sakla veya daha önce oluşturduğun bir yedeği geri yükle.
      </p>
    </div>
  </div>

  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
    <button
      type="button"
      disabled={backupBusy || saving}
      onClick={() => void handleDownloadBackup()}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#244b38] px-4 py-3 text-xs font-semibold text-white transition-colors hover:bg-[#193b2a] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Download size={16} />
      {backupBusy ? 'İşlem sürüyor…' : 'JSON yedeği indir'}
    </button>

    <button
      type="button"
      disabled={backupBusy || saving}
      onClick={() => backupInputRef.current?.click()}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Upload size={16} />
      Yedekten geri yükle
    </button>
  </div>

  <div className="mt-4 rounded-xl bg-[#fafbf9] px-4 py-3">
    <p className="text-xs leading-5 text-slate-600">
      <strong>Veri güvenliği:</strong> Geri yükleme mevcut kayıtlarını
      silmez. Aynı kayıt kimlikleri yeniden eklenmez. Bilgisayarında
      tuttuğun yedek dosyasını tarayıcı verilerini temizlemeden önce
      güvenli bir yerde sakla.
    </p>
  </div>
</section>


<section className="rounded-2xl border border-red-200 bg-white p-5 sm:p-6">
  <div className="flex items-start gap-3">
    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
      <Trash2 size={19} />
    </div>

    <div className="min-w-0 flex-1">
      <h3 className="text-sm font-semibold text-slate-900">
        Tehlikeli alan
      </h3>

      <p className="mt-2 text-xs leading-6 text-slate-500">
        Çalışma Defteri'ni ilk kurulum durumuna döndürür.
        Bütün çalışma kayıtları ve ayarlar silinir; özel dersler
        kaldırılır. Varsayılan TYT ve AYT dersleri korunur.
      </p>

      <p className="mt-2 text-xs font-medium text-red-700">
        Bu işlem geri alınamaz. Önce JSON yedeği al.
      </p>

      <button
        type="button"
        disabled={backupBusy || saving}
        onClick={() => void handleResetAllData()}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 size={15} />
        {backupBusy ? 'İşlem sürüyor…' : 'Tüm verileri sıfırla'}
      </button>
    </div>
  </div>
</section>


      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4ee] text-[#426b52]">
            <Plus size={19} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Yeni ders ekle
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Ders, seçtiğin sınav türünün listesine eklenecek.
            </p>
          </div>
        </div>

        <form onSubmit={handleAdd} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-end">
          <div>
            <label htmlFor="new-subject-exam" className="text-xs font-medium text-slate-700">
              Sınav türü
            </label>
            <select
              id="new-subject-exam"
              value={examType}
              onChange={(event) => setExamType(event.target.value as ExamType)}
              className={`${inputClass} mt-1.5`}
            >
              <option value="TYT">TYT</option>
              <option value="AYT">AYT</option>
            </select>
          </div>

          <div>
            <label htmlFor="new-subject-name" className="text-xs font-medium text-slate-700">
              Ders adı
            </label>
            <input
              id="new-subject-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Örn. Geometri"
              maxLength={80}
              required
              className={`${inputClass} mt-1.5`}
            />
          </div>

          <button
            type="submit"
            disabled={saving || !newName.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#244b38] px-4 py-3 text-xs font-semibold text-white hover:bg-[#193b2a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={15} />
            Dersi ekle
          </button>
        </form>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Dersler yükleniyor…
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
          {renderSubjectList('Temel Yeterlilik Testi', 'TYT', tytSubjects)}
          {renderSubjectList('Alan Yeterlilik Testi', 'AYT', aytSubjects)}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Settings size={19} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Yerel verilerin hakkında
            </h3>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              Derslerin ve çalışma kayıtların bu tarayıcının IndexedDB
              depolamasında tutulur. Tarayıcı verilerini temizlemek kayıtlarını
              silebilir. Lütfen düzenli aralıklarla verilerini yedekle. İleriki
              aşamalarda bulut tabanlı yedekleme sistemi eklenecek.
            </p>
          </div>
        </div>
      </section>
    </div>
  )

}