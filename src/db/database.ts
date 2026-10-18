import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { BackupPayload, BackupImportResult } from '../types/backup'
import type {
  AppSetting,
  Category,
  ExamType,
  Subject,
  StudyRecord,
  StudyRecordDraft,
} from '../types/study'

interface StudyDatabase extends DBSchema {
  categories: {
    key: string
    value: Category
  }
  subjects: {
    key: string
    value: Subject
    indexes: {
      'by-exam-type': ExamType
      'by-category': string
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
const DATABASE_VERSION = 2
export const LEGACY_TYT_CATEGORY_ID = 'legacy-tyt'
export const LEGACY_AYT_CATEGORY_ID = 'legacy-ayt'

let databasePromise: Promise<IDBPDatabase<StudyDatabase>> | undefined

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function makeLegacyCategory(id: string, name: string, now: string): Category {
  return { id, name, createdAt: now, updatedAt: now }
}

function openDatabase(): Promise<IDBPDatabase<StudyDatabase>> {
  if (!databasePromise) {
    databasePromise = openDB<StudyDatabase>(
      DATABASE_NAME,
      DATABASE_VERSION,
      {
        upgrade(db, oldVersion, _newVersion, tx) {
          if (!db.objectStoreNames.contains('categories')) {
            db.createObjectStore('categories', { keyPath: 'id' })
          }

          if (!db.objectStoreNames.contains('subjects')) {
            const store = db.createObjectStore('subjects', { keyPath: 'id' })
            store.createIndex('by-exam-type', 'examType')
            store.createIndex('by-category', 'categoryId')
          } else {
            const store = tx.objectStore('subjects')
            if (!store.indexNames.contains('by-exam-type')) {
              store.createIndex('by-exam-type', 'examType')
            }
            if (!store.indexNames.contains('by-category')) {
              store.createIndex('by-category', 'categoryId')
            }
          }

          if (!db.objectStoreNames.contains('records')) {
            const store = db.createObjectStore('records', { keyPath: 'id' })
            store.createIndex('by-date', 'date')
            store.createIndex('by-subject', 'subjectId')
          } else {
            const store = tx.objectStore('records')
            if (!store.indexNames.contains('by-date')) {
              store.createIndex('by-date', 'date')
            }
            if (!store.indexNames.contains('by-subject')) {
              store.createIndex('by-subject', 'subjectId')
            }
          }

          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' })
          }

          // Version 1 users have TYT/AYT subjects. Preserve every existing ID,
          // timestamp and record relationship while mapping their subjects to
          // editable category records. A fresh database (oldVersion === 0)
          // deliberately starts with no categories and no subjects.
          if (oldVersion > 0 && oldVersion < 2) {
            const now = new Date().toISOString()
            const categoryStore = tx.objectStore('categories')
            categoryStore.put(
              makeLegacyCategory(LEGACY_TYT_CATEGORY_ID, 'TYT', now),
            )
            categoryStore.put(
              makeLegacyCategory(LEGACY_AYT_CATEGORY_ID, 'AYT', now),
            )

            const subjectStore = tx.objectStore('subjects')
            const migrateExistingSubjects = async () => {
              let cursor = await subjectStore.openCursor()
              while (cursor) {
                const subject = cursor.value as Subject
                const categoryId =
                  subject.examType === 'AYT'
                    ? LEGACY_AYT_CATEGORY_ID
                    : LEGACY_TYT_CATEGORY_ID

                await cursor.update({ ...subject, categoryId })
                cursor = await cursor.continue()
              }
            }
            void migrateExistingSubjects()
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

export async function getCategories(): Promise<Category[]> {
  const db = await openDatabase()
  return (await db.getAll('categories')).sort((a, b) =>
    a.name.localeCompare(b.name, 'tr'),
  )
}

export async function addCategory(name: string): Promise<Category> {
  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('Kategori adı boş olamaz.')
  if (trimmedName.length > 80) {
    throw new Error('Kategori adı en fazla 80 karakter olabilir.')
  }

  const db = await openDatabase()
  const categories = await db.getAll('categories')
  const normalized = trimmedName.toLocaleLowerCase('tr-TR')
  if (
    categories.some(
      (category) =>
        category.name.trim().toLocaleLowerCase('tr-TR') === normalized,
    )
  ) {
    throw new Error('Bu isimde bir kategori zaten var.')
  }

  const now = new Date().toISOString()
  const category: Category = {
    id: createId(),
    name: trimmedName,
    createdAt: now,
    updatedAt: now,
  }
  await db.add('categories', category)
  return category
}

export async function renameCategory(
  id: string,
  name: string,
): Promise<Category> {
  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('Kategori adı boş olamaz.')
  if (trimmedName.length > 80) {
    throw new Error('Kategori adı en fazla 80 karakter olabilir.')
  }

  const db = await openDatabase()
  const category = await db.get('categories', id)
  if (!category) throw new Error('Kategori bulunamadı.')

  const normalized = trimmedName.toLocaleLowerCase('tr-TR')
  const categories = await db.getAll('categories')
  if (
    categories.some(
      (item) =>
        item.id !== id &&
        item.name.trim().toLocaleLowerCase('tr-TR') === normalized,
    )
  ) {
    throw new Error('Bu isimde bir kategori zaten var.')
  }

  const updated: Category = {
    ...category,
    name: trimmedName,
    updatedAt: new Date().toISOString(),
  }
  await db.put('categories', updated)
  return updated
}

export async function deleteCategory(id: string): Promise<number> {
  const db = await openDatabase()
  const tx = db.transaction(['categories', 'subjects'], 'readwrite')
  const categoryStore = tx.objectStore('categories')
  const subjectStore = tx.objectStore('subjects')
  const category = await categoryStore.get(id)

  if (!category) {
    await tx.done
    throw new Error('Kategori bulunamadı.')
  }

  const subjects = await subjectStore.getAll()
  const attached = subjects.filter((subject) => subject.categoryId === id)
  for (const subject of attached) {
    const updated: Subject = { ...subject }
    delete updated.categoryId
    delete updated.examType
    await subjectStore.put(updated)
  }

  await categoryStore.delete(id)
  await tx.done
  return attached.length
}

export async function getSubjects(): Promise<Subject[]> {
  const db = await openDatabase()
  const [subjects, categories] = await Promise.all([
    db.getAll('subjects'),
    db.getAll('categories'),
  ])
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]))

  return subjects.sort((a, b) => {
    const categoryA = categoryNames.get(a.categoryId ?? '') ?? '\uffff'
    const categoryB = categoryNames.get(b.categoryId ?? '') ?? '\uffff'
    const categoryOrder = categoryA.localeCompare(categoryB, 'tr')
    if (categoryOrder !== 0) return categoryOrder
    return a.name.localeCompare(b.name, 'tr')
  })
}

export async function getStudyRecordsByDate(
  date: string,
): Promise<StudyRecord[]> {
  const db = await openDatabase()
  const records = await db.getAllFromIndex('records', 'by-date', date)
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

function legacyExamTypeForCategory(categoryId?: string): ExamType | undefined {
  if (categoryId === LEGACY_TYT_CATEGORY_ID) return 'TYT'
  if (categoryId === LEGACY_AYT_CATEGORY_ID) return 'AYT'
  return undefined
}

export async function saveStudyRecord(
  draft: StudyRecordDraft,
  existingRecord?: StudyRecord,
): Promise<StudyRecord> {
  const db = await openDatabase()
  const subject = await db.get('subjects', draft.subjectId)
  if (!subject) throw new Error('Seçilen ders bulunamadı.')

  if (
    draft.examType &&
    subject.examType &&
    subject.examType !== draft.examType
  ) {
    throw new Error('Seçilen ders, eski sınav türüyle eşleşmiyor.')
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.date) ||
    Number.isNaN(new Date(`${draft.date}T12:00:00`).getTime())
  ) {
    throw new Error('Geçerli bir çalışma tarihi girilmelidir.')
  }
  if (!Number.isInteger(draft.questionCount) || draft.questionCount < 0) {
    throw new Error('Soru sayısı negatif olmayan bir tam sayı olmalıdır.')
  }

  const counts = [draft.correctCount, draft.incorrectCount, draft.blankCount]
  for (const count of counts) {
    if (count !== undefined && (!Number.isInteger(count) || count < 0)) {
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
  const examType = legacyExamTypeForCategory(subject.categoryId)
  const record: StudyRecord = {
    ...draft,
    examType,
    id: existingRecord?.id ?? createId(),
    createdAt: existingRecord?.createdAt ?? now,
    updatedAt: now,
  }
  await db.put('records', record)
  return record
}

export async function deleteStudyRecord(id: string): Promise<void> {
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
  await db.put('settings', { key, value, updatedAt: new Date().toISOString() })
}

export async function addSubject(
  name: string,
  categoryId?: string,
): Promise<Subject> {
  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('Ders adı boş olamaz.')
  if (trimmedName.length > 80) {
    throw new Error('Ders adı en fazla 80 karakter olabilir.')
  }

  const db = await openDatabase()
  const [subjects, category] = await Promise.all([
    db.getAll('subjects'),
    categoryId ? db.get('categories', categoryId) : Promise.resolve(undefined),
  ])
  if (categoryId && !category) throw new Error('Seçilen kategori bulunamadı.')

  const normalized = trimmedName.toLocaleLowerCase('tr-TR')
  if (
    subjects.some(
      (subject) =>
        (subject.categoryId ?? '') === (categoryId ?? '') &&
        subject.name.trim().toLocaleLowerCase('tr-TR') === normalized,
    )
  ) {
    throw new Error('Bu kategoride aynı isimli bir ders zaten var.')
  }

  const subject: Subject = {
    id: createId(),
    name: trimmedName,
    ...(categoryId ? { categoryId } : {}),
    ...(legacyExamTypeForCategory(categoryId)
      ? { examType: legacyExamTypeForCategory(categoryId) }
      : {}),
    createdAt: new Date().toISOString(),
  }
  await db.add('subjects', subject)
  return subject
}

export async function updateSubjectCategory(
  id: string,
  categoryId?: string,
): Promise<Subject> {
  const db = await openDatabase()
  const subject = await db.get('subjects', id)
  if (!subject) throw new Error('Ders bulunamadı.')

  if (categoryId && !(await db.get('categories', categoryId))) {
    throw new Error('Seçilen kategori bulunamadı.')
  }

  const allSubjects = await db.getAll('subjects')
  const normalizedName = subject.name.trim().toLocaleLowerCase('tr-TR')
  if (
    allSubjects.some(
      (item) =>
        item.id !== id &&
        (item.categoryId ?? '') === (categoryId ?? '') &&
        item.name.trim().toLocaleLowerCase('tr-TR') === normalizedName,
    )
  ) {
    throw new Error('Bu kategoride aynı isimli bir ders zaten var.')
  }

  const updated: Subject = { ...subject }
  if (categoryId) updated.categoryId = categoryId
  else delete updated.categoryId

  const legacyType = legacyExamTypeForCategory(categoryId)
  if (legacyType) updated.examType = legacyType
  else delete updated.examType

  await db.put('subjects', updated)
  return updated
}

export async function renameSubject(
  id: string,
  name: string,
): Promise<Subject> {
  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('Ders adı boş olamaz.')
  if (trimmedName.length > 80) {
    throw new Error('Ders adı en fazla 80 karakter olabilir.')
  }

  const db = await openDatabase()
  const subject = await db.get('subjects', id)
  if (!subject) throw new Error('Ders bulunamadı.')

  const normalized = trimmedName.toLocaleLowerCase('tr-TR')
  const subjects = await db.getAll('subjects')
  if (
    subjects.some(
      (item) =>
        item.id !== id &&
        (item.categoryId ?? '') === (subject.categoryId ?? '') &&
        item.name.trim().toLocaleLowerCase('tr-TR') === normalized,
    )
  ) {
    throw new Error('Bu kategoride aynı isimli bir ders zaten var.')
  }

  const updated: Subject = { ...subject, name: trimmedName }
  await db.put('subjects', updated)
  return updated
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
      `Bu derse ait ${linkedRecordCount} çalışma kaydı var. Geçmişi korumak için önce kayıtları düzenle veya sil.`,
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
    ['categories', 'subjects', 'records', 'settings'],
    'readwrite',
  )

  try {
    const categoryStore = tx.objectStore('categories')
    const subjectStore = tx.objectStore('subjects')
    const recordStore = tx.objectStore('records')
    const settingsStore = tx.objectStore('settings')
    const [currentCategories, currentSubjects, currentRecords, currentSettings] =
      await Promise.all([
        categoryStore.getAll(),
        subjectStore.getAll(),
        recordStore.getAll(),
        settingsStore.getAll(),
      ])

    const knownCategories = [...currentCategories]
    const categoryIdMap = new Map<string, string>()
    let categoriesAdded = 0
    for (const incoming of data.categories) {
      const sameId = knownCategories.find((category) => category.id === incoming.id)
      if (sameId) {
        categoryIdMap.set(incoming.id, sameId.id)
        continue
      }

      const normalizedName = incoming.name.trim().toLocaleLowerCase('tr-TR')
      const sameName = knownCategories.find(
        (category) =>
          category.name.trim().toLocaleLowerCase('tr-TR') === normalizedName,
      )
      if (sameName) {
        categoryIdMap.set(incoming.id, sameName.id)
        continue
      }

      await categoryStore.add(incoming)
      knownCategories.push(incoming)
      categoryIdMap.set(incoming.id, incoming.id)
      categoriesAdded += 1
    }

    const knownSubjects = [...currentSubjects]
    const subjectIdMap = new Map<string, string>()
    let subjectsAdded = 0
    let recordsAdded = 0
    let recordsSkipped = 0
    let settingsAdded = 0

    for (const incoming of data.subjects) {
      const mappedCategoryId = incoming.categoryId
        ? categoryIdMap.get(incoming.categoryId) ?? incoming.categoryId
        : undefined

      const sameId = knownSubjects.find((subject) => subject.id === incoming.id)
      if (sameId) {
        subjectIdMap.set(incoming.id, sameId.id)
        continue
      }

      const normalizedName = incoming.name.trim().toLocaleLowerCase('tr-TR')
      const sameName = knownSubjects.find(
        (subject) =>
          (subject.categoryId ?? '') === (mappedCategoryId ?? '') &&
          subject.name.trim().toLocaleLowerCase('tr-TR') === normalizedName,
      )
      if (sameName) {
        subjectIdMap.set(incoming.id, sameName.id)
        continue
      }

      const mappedSubject: Subject = {
        ...incoming,
        ...(mappedCategoryId ? { categoryId: mappedCategoryId } : {}),
      }
      await subjectStore.add(mappedSubject)
      knownSubjects.push(mappedSubject)
      subjectIdMap.set(incoming.id, mappedSubject.id)
      subjectsAdded += 1
    }

    const knownRecordIds = new Set(currentRecords.map((record) => record.id))
    for (const incoming of data.records) {
      if (knownRecordIds.has(incoming.id)) {
        recordsSkipped += 1
        continue
      }

      const mappedSubjectId =
        subjectIdMap.get(incoming.subjectId) ??
        knownSubjects.find((subject) => subject.id === incoming.subjectId)?.id
      if (!mappedSubjectId) {
        throw new Error(
          `"${incoming.topic}" kaydının dersi bulunamadı. Yedek içe aktarılmadı.`,
        )
      }

      await recordStore.add({ ...incoming, subjectId: mappedSubjectId })
      knownRecordIds.add(incoming.id)
      recordsAdded += 1
    }

    const knownSettingKeys = new Set(currentSettings.map((setting) => setting.key))
    for (const setting of data.settings) {
      if (knownSettingKeys.has(setting.key)) continue
      await settingsStore.add(setting)
      knownSettingKeys.add(setting.key)
      settingsAdded += 1
    }

    await tx.done
    return {
      categoriesAdded,
      subjectsAdded,
      recordsAdded,
      recordsSkipped,
      settingsAdded,
    }
  } catch (error) {
    try {
      tx.abort()
    } catch {
      // The transaction may already have completed or been aborted.
    }
    try {
      await tx.done
    } catch {
      // Consume the abort completion error.
    }
    throw error
  }
}

/** Clears local data explicitly requested by the user; no defaults are recreated. */
export async function resetAllData(): Promise<number> {
  const db = await openDatabase()
  const tx = db.transaction(
    ['categories', 'subjects', 'records', 'settings'],
    'readwrite',
  )
  const categoryStore = tx.objectStore('categories')
  const subjectStore = tx.objectStore('subjects')
  const recordStore = tx.objectStore('records')
  const settingsStore = tx.objectStore('settings')
  const recordsDeleted = await recordStore.count()

  await Promise.all([
    categoryStore.clear(),
    subjectStore.clear(),
    recordStore.clear(),
    settingsStore.clear(),
  ])
  await tx.done
  return recordsDeleted
}
