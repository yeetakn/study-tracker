
import { format } from 'date-fns'
import {
  getAllStudyRecords,
  getSettings,
  getSubjects,
} from '../db/database'
import type { BackupPayload } from '../types/backup'
import type {
  AppSetting,
  ExamType,
  Subject,
  StudyRecord,
} from '../types/study'

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
  if (!isString(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T12:00:00`)

  return (
    Number.isFinite(date.getTime()) &&
    format(date, 'yyyy-MM-dd') === value
  )
}

function isOptionalText(value: unknown): boolean {
  return value === undefined || isString(value)
}

function isOptionalCount(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 0)
  )
}

function isSubject(value: unknown): value is Subject {
  return (
    isObject(value) &&
    isString(value.id) &&
    value.id.length > 0 &&
    isString(value.name) &&
    value.name.trim().length > 0 &&
    isExamType(value.examType) &&
    isTimestamp(value.createdAt)
  )
}

function isStudyRecord(value: unknown): value is StudyRecord {
  if (
    !isObject(value) ||
    !isString(value.id) ||
    value.id.length === 0 ||
    !isDateKey(value.date) ||
    !isExamType(value.examType) ||
    !isString(value.subjectId) ||
    value.subjectId.length === 0 ||
    !isString(value.topic) ||
    !Number.isInteger(value.questionCount) ||
    (value.questionCount as number) < 0 ||
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

  const counts = [
    value.correctCount,
    value.incorrectCount,
    value.blankCount,
  ].filter((count): count is number => typeof count === 'number')

  return counts.reduce((sum, count) => sum + count, 0) <=
    (value.questionCount as number)
}

function isSetting(value: unknown): value is AppSetting {
  if (
    !isObject(value) ||
    !isString(value.key) ||
    value.key.length === 0 ||
    !isTimestamp(value.updatedAt)
  ) {
    return false
  }

  const settingValue = value.value

  return (
    settingValue === null ||
    isString(settingValue) ||
    typeof settingValue === 'boolean' ||
    (typeof settingValue === 'number' &&
      Number.isFinite(settingValue))
  )
}

function validateBackup(value: unknown): BackupPayload {
  if (
    !isObject(value) ||
    value.format !== 'calisma-defteri-backup' ||
    value.backupVersion !== 1 ||
    !isString(value.appVersion) ||
    !isTimestamp(value.createdAt) ||
    !isObject(value.data) ||
    !Array.isArray(value.data.subjects) ||
    !Array.isArray(value.data.records) ||
    !Array.isArray(value.data.settings)
  ) {
    throw new Error(
      'Dosya geçerli bir Çalışma Defteri yedeği değil veya yedek biçimi desteklenmiyor.',
    )
  }

  const subjects = value.data.subjects
  const records = value.data.records
  const settings = value.data.settings

  if (
    !subjects.every(isSubject) ||
    !records.every(isStudyRecord) ||
    !settings.every(isSetting)
  ) {
    throw new Error(
      'Yedekte hatalı veya eksik alanlar var. Mevcut verilerine dokunulmadı.',
    )
  }

  const subjectIds = new Set<string>()

  for (const subject of subjects) {
    if (subjectIds.has(subject.id)) {
      throw new Error('Yedekte yinelenen ders kimlikleri bulundu.')
    }

    subjectIds.add(subject.id)
  }

  const recordIds = new Set<string>()

  for (const record of records) {
    if (recordIds.has(record.id)) {
      throw new Error('Yedekte yinelenen çalışma kaydı kimlikleri bulundu.')
    }

    recordIds.add(record.id)

    const subject = subjects.find(
      (item) => item.id === record.subjectId,
    )

    if (!subject || subject.examType !== record.examType) {
      throw new Error(
        `"${record.topic}" kaydının ders bağlantısı yedekte geçersiz.`,
      )
    }
  }

  const settingKeys = new Set<string>()

  for (const setting of settings) {
    if (settingKeys.has(setting.key)) {
      throw new Error('Yedekte yinelenen ayar anahtarları bulundu.')
    }

    settingKeys.add(setting.key)
  }

  return value as unknown as BackupPayload
}

export async function downloadBackup(): Promise<void> {
  const [subjects, records, settings] = await Promise.all([
    getSubjects(),
    getAllStudyRecords(),
    getSettings(),
  ])

  const backup: BackupPayload = {
    format: 'calisma-defteri-backup',
    backupVersion: 1,
    appVersion: '0.1.0',
    createdAt: new Date().toISOString(),
    data: {
      subjects,
      records,
      settings,
    },
  }

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: 'application/json;charset=utf-8' },
  )

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `calisma-defteri-yedek-${format(
    new Date(),
    'yyyy-MM-dd',
  )}.json`

  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function readBackupFile(
  file: File,
): Promise<BackupPayload> {
  if (!file.name.toLocaleLowerCase('tr-TR').endsWith('.json')) {
    throw new Error('Lütfen .json uzantılı bir yedek dosyası seç.')
  }

  let parsed: unknown

  try {
    const text = await file.text()
    parsed = JSON.parse(text)
  } catch {
    throw new Error(
      'Dosya okunamadı. Dosya geçerli bir JSON belgesi değil.',
    )
  }

  return validateBackup(parsed)
}
