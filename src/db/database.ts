import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { BackupPayload, BackupImportResult } from '../types/backup'
import type {
  AppSetting,
  ExamType,
  Subject,
  StudyRecord,
  StudyRecordDraft,
} from '../types/study'

interface StudyDatabase extends DBSchema {
  subjects: {
    key: string
    value: Subject
    indexes: {
      'by-exam-type': ExamType
    }
  }

  records: {
    key: string
    value: StudyRecord
    indexes: {
      'by-date': string
      'by-subject': string
    }
  }

  settings: {
    key: string
    value: AppSetting
  }
}

const DATABASE_NAME = 'calisma-defteri'
const DATABASE_VERSION = 1

const defaultSubjects: Array<{
  id: string
  name: string
  examType: ExamType
}> = [
  { id: 'tyt-turkce', name: 'Türkçe', examType: 'TYT' },
  { id: 'tyt-tarih', name: 'Tarih', examType: 'TYT' },
  { id: 'tyt-cografya', name: 'Coğrafya', examType: 'TYT' },
  { id: 'tyt-felsefe', name: 'Felsefe', examType: 'TYT' },
  { id: 'tyt-din', name: 'Din Kültürü', examType: 'TYT' },
  { id: 'tyt-matematik', name: 'Matematik', examType: 'TYT' },
  { id: 'tyt-fizik', name: 'Fizik', examType: 'TYT' },
  { id: 'tyt-kimya', name: 'Kimya', examType: 'TYT' },
  { id: 'tyt-biyoloji', name: 'Biyoloji', examType: 'TYT' },

  { id: 'ayt-matematik', name: 'Matematik', examType: 'AYT' },
  { id: 'ayt-fizik', name: 'Fizik', examType: 'AYT' },
  { id: 'ayt-kimya', name: 'Kimya', examType: 'AYT' },
  { id: 'ayt-biyoloji', name: 'Biyoloji', examType: 'AYT' },
]

let databasePromise: Promise<IDBPDatabase<StudyDatabase>> | undefined

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function openDatabase(): Promise<IDBPDatabase<StudyDatabase>> {
  if (!databasePromise) {
    databasePromise = openDB<StudyDatabase>(
      DATABASE_NAME,
      DATABASE_VERSION,
      {
        upgrade(db) {
          if (!db.objectStoreNames.contains('subjects')) {
            const store = db.createObjectStore('subjects', {
              keyPath: 'id',
            })

            store.createIndex('by-exam-type', 'examType')

            const now = new Date().toISOString()

            for (const subject of defaultSubjects) {
              store.add({
                ...subject,
                createdAt: now,
              })
            }
          }

          if (!db.objectStoreNames.contains('records')) {
            const store = db.createObjectStore('records', {
              keyPath: 'id',
            })

            store.createIndex('by-date', 'date')
            store.createIndex('by-subject', 'subjectId')
          }

          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', {
              keyPath: 'key',
            })
          }
        },
      },
    ).catch((error: unknown) => {
      databasePromise = undefined
      throw error
    })
  }

  return databasePromise
}

export async function getSubjects(): Promise<Subject[]> {
  const db = await openDatabase()
  const subjects = await db.getAll('subjects')

  return subjects.sort((a, b) => {
    if (a.examType !== b.examType) {
      return a.examType === 'TYT' ? -1 : 1
    }

    return a.name.localeCompare(b.name, 'tr')
  })
}

export async function getStudyRecordsByDate(
  date: string,
): Promise<StudyRecord[]> {
  const db = await openDatabase()

  const records = await db.getAllFromIndex(
    'records',
    'by-date',
    date,
  )

  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getStudyRecordsForDateRange(
  startDate: string,
  endDate: string,
): Promise<StudyRecord[]> {
  if (startDate > endDate) {
    throw new Error('Başlangıç tarihi bitiş tarihinden sonra olamaz.')
  }

  const db = await openDatabase()

  return db.getAllFromIndex(
    'records',
    'by-date',
    IDBKeyRange.bound(startDate, endDate),
  )
}

export async function getAllStudyRecords(): Promise<StudyRecord[]> {
  const db = await openDatabase()
  return db.getAll('records')
}

export async function saveStudyRecord(
  draft: StudyRecordDraft,
  existingRecord?: StudyRecord,
): Promise<StudyRecord> {
  const db = await openDatabase()

  const subject = await db.get('subjects', draft.subjectId)

  if (!subject) {
    throw new Error('Seçilen ders bulunamadı.')
  }

  if (subject.examType !== draft.examType) {
    throw new Error('Seçilen ders, sınav türüyle eşleşmiyor.')
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.date) ||
    Number.isNaN(new Date(`${draft.date}T12:00:00`).getTime())
  ) {
    throw new Error('Geçerli bir çalışma tarihi girilmelidir.')
  }

  if (
    !Number.isInteger(draft.questionCount) ||
    draft.questionCount < 0
  ) {
    throw new Error('Soru sayısı negatif olmayan bir tam sayı olmalıdır.')
  }

  const counts = [
    draft.correctCount,
    draft.incorrectCount,
    draft.blankCount,
  ]

  for (const count of counts) {
    if (
      count !== undefined &&
      (!Number.isInteger(count) || count < 0)
    ) {
      throw new Error('Doğru, yanlış ve boş sayıları negatif olamaz.')
    }
  }

  const enteredCounts = counts.filter(
    (count): count is number => count !== undefined,
  )

  if (
    enteredCounts.length > 0 &&
    enteredCounts.reduce((total, count) => total + count, 0) >
      draft.questionCount
  ) {
    throw new Error(
      'Doğru, yanlış ve boş sayılarının toplamı çözülen soru sayısını aşamaz.',
    )
  }

  const now = new Date().toISOString()

  const record: StudyRecord = {
    ...draft,
    id: existingRecord?.id ?? createId(),
    createdAt: existingRecord?.createdAt ?? now,
    updatedAt: now,
  }

  await db.put('records', record)

  return record
}

export async function deleteStudyRecord(
  id: string,
): Promise<void> {
  const db = await openDatabase()
  await db.delete('records', id)
}

export async function getSettings(): Promise<AppSetting[]> {
  const db = await openDatabase()
  return db.getAll('settings')
}

export async function saveSetting(
  key: string,
  value: AppSetting['value'],
): Promise<void> {
  const db = await openDatabase()

  await db.put('settings', {
    key,
    value,
    updatedAt: new Date().toISOString(),
  })
}

export async function addSubject(
  name: string,
  examType: ExamType,
): Promise<Subject> {
  const trimmedName = name.trim()

  if (!trimmedName) {
    throw new Error('Ders adı boş olamaz.')
  }

  if (trimmedName.length > 80) {
    throw new Error('Ders adı en fazla 80 karakter olabilir.')
  }

  const db = await openDatabase()
  const subjects = await db.getAll('subjects')

  const normalizedName = trimmedName.toLocaleLowerCase('tr-TR')

  const duplicate = subjects.some(
    (subject) =>
      subject.examType === examType &&
      subject.name.toLocaleLowerCase('tr-TR') === normalizedName,
  )

  if (duplicate) {
    throw new Error('Bu sınav türünde aynı isimli bir ders zaten var.')
  }

  const subject: Subject = {
    id: createId(),
    name: trimmedName,
    examType,
    createdAt: new Date().toISOString(),
  }

  await db.add('subjects', subject)

  return subject
}

export async function renameSubject(
  id: string,
  name: string,
): Promise<Subject> {
  const trimmedName = name.trim()

  if (!trimmedName) {
    throw new Error('Ders adı boş olamaz.')
  }

  if (trimmedName.length > 80) {
    throw new Error('Ders adı en fazla 80 karakter olabilir.')
  }

  const db = await openDatabase()
  const subject = await db.get('subjects', id)

  if (!subject) {
    throw new Error('Ders bulunamadı.')
  }

  const normalizedName = trimmedName.toLocaleLowerCase('tr-TR')
  const subjects = await db.getAll('subjects')

  const duplicate = subjects.some(
    (item) =>
      item.id !== id &&
      item.examType === subject.examType &&
      item.name.toLocaleLowerCase('tr-TR') === normalizedName,
  )

  if (duplicate) {
    throw new Error('Bu sınav türünde aynı isimli bir ders zaten var.')
  }

  const updatedSubject: Subject = {
    ...subject,
    name: trimmedName,
  }

  await db.put('subjects', updatedSubject)

  return updatedSubject
}
export async function deleteSubject(id: string): Promise<void> {
  const db = await openDatabase()

  const tx = db.transaction(['subjects', 'records'], 'readwrite')
  const subjectStore = tx.objectStore('subjects')
  const recordStore = tx.objectStore('records')

  const [subject, linkedRecordCount] = await Promise.all([
    subjectStore.get(id),
    recordStore.index('by-subject').count(id),
  ])

  if (!subject) {
    await tx.done
    throw new Error('Ders bulunamadı.')
  }

  if (linkedRecordCount > 0) {
    await tx.done
    throw new Error(
      `Bu derse ait ${linkedRecordCount} çalışma kaydı var. Geçmişi korumak için önce bu kayıtları düzenle veya sil.`,
    )
  }

  await subjectStore.delete(id)
  await tx.done
}

export async function mergeBackupData(
  data: BackupPayload['data'],
): Promise<BackupImportResult> {
  const db = await openDatabase()

  const tx = db.transaction(
    ['subjects', 'records', 'settings'],
    'readwrite',
  )

  try {
    const subjectStore = tx.objectStore('subjects')
    const recordStore = tx.objectStore('records')
    const settingsStore = tx.objectStore('settings')

    const [currentSubjects, currentRecords, currentSettings] =
      await Promise.all([
        subjectStore.getAll(),
        recordStore.getAll(),
        settingsStore.getAll(),
      ])

    const knownSubjects = [...currentSubjects]
    const subjectIdMap = new Map<string, string>()

    let subjectsAdded = 0
    let recordsAdded = 0
    let recordsSkipped = 0
    let settingsAdded = 0

    // Dersleri mevcut kayıtlarla güvenli biçimde eşleştir.
    for (const incoming of data.subjects) {
      const sameId = knownSubjects.find(
        (subject) => subject.id === incoming.id,
      )

      if (sameId) {
        if (sameId.examType !== incoming.examType) {
          throw new Error(
            `"${incoming.name}" dersi için sınav türü uyuşmazlığı var.`,
          )
        }

        subjectIdMap.set(incoming.id, sameId.id)
        continue
      }

      const normalizedName = incoming.name
        .trim()
        .toLocaleLowerCase('tr-TR')

      const sameName = knownSubjects.find(
        (subject) =>
          subject.examType === incoming.examType &&
          subject.name.trim().toLocaleLowerCase('tr-TR') ===
            normalizedName,
      )

      if (sameName) {
        subjectIdMap.set(incoming.id, sameName.id)
        continue
      }

      await subjectStore.add(incoming)
      knownSubjects.push(incoming)
      subjectIdMap.set(incoming.id, incoming.id)
      subjectsAdded += 1
    }

    // Mevcut kayıt kimliklerini koru; aynı ID'yi ikinci kez ekleme.
    const knownRecordIds = new Set(
      currentRecords.map((record) => record.id),
    )

    for (const incoming of data.records) {
      if (knownRecordIds.has(incoming.id)) {
        recordsSkipped += 1
        continue
      }

      const mappedSubjectId =
        subjectIdMap.get(incoming.subjectId) ??
        knownSubjects.find(
          (subject) => subject.id === incoming.subjectId,
        )?.id

      if (!mappedSubjectId) {
        throw new Error(
          `"${incoming.topic}" kaydının dersi bulunamadı. Yedek içe aktarılmadı.`,
        )
      }

      const mappedSubject = knownSubjects.find(
        (subject) => subject.id === mappedSubjectId,
      )

      if (!mappedSubject || mappedSubject.examType !== incoming.examType) {
        throw new Error(
          `"${incoming.topic}" kaydı ile dersinin sınav türü eşleşmiyor.`,
        )
      }

      await recordStore.add({
        ...incoming,
        subjectId: mappedSubjectId,
      })

      knownRecordIds.add(incoming.id)
      recordsAdded += 1
    }

    // Yerel ayarları ezme; yalnızca henüz bulunmayanları ekle.
    const knownSettingKeys = new Set(
      currentSettings.map((setting) => setting.key),
    )

    for (const setting of data.settings) {
      if (knownSettingKeys.has(setting.key)) continue

      await settingsStore.add(setting)
      knownSettingKeys.add(setting.key)
      settingsAdded += 1
    }

    await tx.done

    return {
      subjectsAdded,
      recordsAdded,
      recordsSkipped,
      settingsAdded,
    }
  } catch (error) {
    try {
      tx.abort()
    } catch {
      // İşlem zaten tamamlanmış veya iptal edilmiş olabilir.
    }

    try {
      await tx.done
    } catch {
      // İptal edilen işlemin tamamlanma hatasını burada tüket.
    }

    throw error
  }
}


/**
 * Uygulama verilerini sıfırlar.
 * Çalışma kayıtlarını ve ayarları temizler, varsayılan dersleri geri yükler.
 * İşlemler başarısız olursa IndexedDB transaction değişiklikleri geri alır.
 */
export async function resetAllData(): Promise<number> {
  const db = await openDatabase()

  const tx = db.transaction(
    ['subjects', 'records', 'settings'],
    'readwrite',
  )

  const subjectStore = tx.objectStore('subjects')
  const recordStore = tx.objectStore('records')
  const settingsStore = tx.objectStore('settings')

  const recordsDeleted = await recordStore.count()

  await Promise.all([
    subjectStore.clear(),
    recordStore.clear(),
    settingsStore.clear(),
  ])

  const createdAt = new Date().toISOString()

  await Promise.all(
    defaultSubjects.map((subject) =>
      subjectStore.add({
        ...subject,
        createdAt,
      }),
    ),
  )

  await tx.done

  return recordsDeleted
}
