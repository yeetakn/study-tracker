import type {
  AppSetting,
  Category,
  Subject,
  StudyRecord,
} from './study'

export interface BackupPayload {
  format: 'calisma-defteri-backup'
  backupVersion: 2
  appVersion: string
  createdAt: string
  data: {
    categories: Category[]
    subjects: Subject[]
    records: StudyRecord[]
    settings: AppSetting[]
  }
}

export interface BackupImportResult {
  categoriesAdded: number
  subjectsAdded: number
  recordsAdded: number
  recordsSkipped: number
  settingsAdded: number
}
