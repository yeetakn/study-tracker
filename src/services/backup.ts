import { format } from 'date-fns'
import {
  getAllStudyRecords,
  getCategories,
  getSettings,
  getSubjects,
} from '../db/database'
import type { BackupPayload } from '../types/backup'
import type {
  AppSetting,
  Category,
  ExamType,
  Subject,
  StudyRecord,
} from '../types/study'

const LEGACY_TYT_CATEGORY_ID = 'legacy-tyt'
const LEGACY_AYT_CATEGORY_ID = 'legacy-ayt'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isTimestamp(value: unknown): value is string {
  return isString(value) && Number.isFinite(Date.parse(value))
}

function isExamType(value: unknown): value is ExamType {
  return value === 'TYT' || value === 'AYT'
}

function isDateKey(value: unknown): value is string {
  if (!isString(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return Number.isFinite(date.getTime()) && format(date, 'yyyy-MM-dd') === value
}

function isOptionalText(value: unknown): boolean {
  return value === undefined || isString(value)
}

function isOptionalCount(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === 'number' && Number.isInteger(value) && value >= 0)
  )
}

function isCategory(value: unknown): value is Category {
  return (
    isObject(value) &&
    isString(value.id) && value.id.length > 0 &&
    isString(value.name) && value.name.trim().length > 0 &&
    isTimestamp(value.createdAt) && isTimestamp(value.updatedAt)
  )
}

function isSubject(value: unknown): value is Subject {
  return (
    isObject(value) &&
    isString(value.id) && value.id.length > 0 &&
    isString(value.name) && value.name.trim().length > 0 &&
    (value.examType === undefined || isExamType(value.examType)) &&
    (value.categoryId === undefined || (isString(value.categoryId) && value.categoryId.length > 0)) &&
    isTimestamp(value.createdAt)
  )
}

function isStudyRecord(value: unknown): value is StudyRecord {
  if (
    !isObject(value) ||
    !isString(value.id) || value.id.length === 0 ||
    !isDateKey(value.date) ||
    (value.examType !== undefined && !isExamType(value.examType)) ||
    !isString(value.subjectId) || value.subjectId.length === 0 ||
    !isString(value.topic) ||
    !Number.isInteger(value.questionCount) || (value.questionCount as number) < 0 ||
    !isOptionalCount(value.correctCount) ||
    !isOptionalCount(value.incorrectCount) ||
    !isOptionalCount(value.blankCount) ||
    !isOptionalText(value.source) ||
    !isOptionalText(value.notes) ||
    !isTimestamp(value.createdAt) ||
    !isTimestamp(value.updatedAt)
  ) {
    return false
  }

  const counts = [value.correctCount, value.incorrectCount, value.blankCount]
    .filter((count): count is number => typeof count === 'number')
  return counts.reduce((sum, count) => sum + count, 0) <= (value.questionCount as number)
}

function isSetting(value: unknown): value is AppSetting {
  if (!isObject(value) || !isString(value.key) || value.key.length === 0 || !isTimestamp(value.updatedAt)) {
    return false
  }
  const settingValue = value.value
  return (
    settingValue === null || isString(settingValue) || typeof settingValue === 'boolean' ||
    (typeof settingValue === 'number' && Number.isFinite(settingValue))
  )
}

function validateBackup(value: unknown): BackupPayload {
  if (
    !isObject(value) ||
    value.format !== 'calisma-defteri-backup' ||
    (value.backupVersion !== 1 && value.backupVersion !== 2) ||
    !isString(value.appVersion) ||
    !isTimestamp(value.createdAt) ||
    !isObject(value.data) ||
    !Array.isArray(value.data.subjects) ||
    !Array.isArray(value.data.records) ||
    !Array.isArray(value.data.settings)
  ) {
    throw new Error('Dosya geçerli bir Çalışma Defteri yedeği değil veya yedek biçimi desteklenmiyor.')
  }

  const version = value.backupVersion
  const rawSubjects = value.data.subjects
  const records = value.data.records
  const settings = value.data.settings
  const rawCategories = version === 2 ? value.data.categories : []

  if (
    (version === 2 && !Array.isArray(rawCategories)) ||
    !rawSubjects.every(isSubject) ||
    !records.every(isStudyRecord) ||
    !settings.every(isSetting) ||
    !(rawCategories as unknown[]).every(isCategory)
  ) {
    throw new Error('Yedekte hatalı veya eksik alanlar var. Mevcut verilerine dokunulmadı.')
  }

  const categories: Category[] = [...(rawCategories as Category[])]
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const now = isTimestamp(value.createdAt) ? value.createdAt : new Date().toISOString()

  // Version 1 backups had no category store. Map their old exam groups into
  // stable, editable categories without changing subject IDs or record links.
  if (version === 1) {
    if (!categoryById.has(LEGACY_TYT_CATEGORY_ID)) {
      const category: Category = { id: LEGACY_TYT_CATEGORY_ID, name: 'TYT', createdAt: now, updatedAt: now }
      categories.push(category)
      categoryById.set(category.id, category)
    }
    if (!categoryById.has(LEGACY_AYT_CATEGORY_ID)) {
      const category: Category = { id: LEGACY_AYT_CATEGORY_ID, name: 'AYT', createdAt: now, updatedAt: now }
      categories.push(category)
      categoryById.set(category.id, category)
    }
  }

  const subjects: Subject[] = rawSubjects.map((subject) => {
    if (subject.categoryId) return { ...subject }
    const legacyCategoryId = subject.examType === 'AYT'
      ? LEGACY_AYT_CATEGORY_ID
      : subject.examType === 'TYT'
        ? LEGACY_TYT_CATEGORY_ID
        : undefined
    return {
      ...subject,
      ...(legacyCategoryId ? { categoryId: legacyCategoryId } : {}),
    }
  })

  const categoryIds = new Set(categories.map((category) => category.id))
  const categoryNames = new Set<string>()
  for (const category of categories) {
    if (categoryIds.size !== categories.length) {
      throw new Error('Yedekte yinelenen kategori kimlikleri bulundu.')
    }
    const normalizedName = category.name.trim().toLocaleLowerCase('tr-TR')
    if (categoryNames.has(normalizedName)) {
      throw new Error('Yedekte yinelenen kategori adları bulundu.')
    }
    categoryNames.add(normalizedName)
  }

  const subjectIds = new Set<string>()
  for (const subject of subjects) {
    if (subjectIds.has(subject.id)) throw new Error('Yedekte yinelenen ders kimlikleri bulundu.')
    subjectIds.add(subject.id)
    if (subject.categoryId && !categoryIds.has(subject.categoryId)) {
      throw new Error(`"${subject.name}" dersi var olmayan bir kategoriye bağlı.`)
    }
  }

  const recordIds = new Set<string>()
  for (const record of records as StudyRecord[]) {
    if (recordIds.has(record.id)) throw new Error('Yedekte yinelenen çalışma kaydı kimlikleri bulundu.')
    recordIds.add(record.id)
    const subject = subjects.find((item) => item.id === record.subjectId)
    if (!subject) throw new Error(`"${record.topic}" kaydının ders bağlantısı yedekte geçersiz.`)
  }

  const settingKeys = new Set<string>()
  for (const setting of settings as AppSetting[]) {
    if (settingKeys.has(setting.key)) throw new Error('Yedekte yinelenen ayar anahtarları bulundu.')
    settingKeys.add(setting.key)
  }

  return {
    format: 'calisma-defteri-backup',
    backupVersion: 2,
    appVersion: value.appVersion,
    createdAt: value.createdAt,
    data: {
      categories,
      subjects,
      records: records as StudyRecord[],
      settings: settings as AppSetting[],
    },
  }
}

export async function downloadBackup(): Promise<void> {
  const [categories, subjects, records, settings] = await Promise.all([
    getCategories(),
    getSubjects(),
    getAllStudyRecords(),
    getSettings(),
  ])

  const backup: BackupPayload = {
    format: 'calisma-defteri-backup',
    backupVersion: 2,
    appVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    data: { categories, subjects, records, settings },
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `calisma-defteri-yedek-${format(new Date(), 'yyyy-MM-dd')}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function readBackupFile(file: File): Promise<BackupPayload> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Dosya okunamadı. Geçerli bir JSON yedeği seçmelisin.')
  }
  return validateBackup(parsed)
}
