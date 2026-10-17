
import type {
  AppSetting,
  Subject,
  StudyRecord,
} from './study'

export interface BackupPayload {
  format: 'calisma-defteri-backup'
  backupVersion: 1
  appVersion: string
  createdAt: string
  data: {
    subjects: Subject[]
    records: StudyRecord[]
    settings: AppSetting[]
  }
}

export interface BackupImportResult {
  subjectsAdded: number
  recordsAdded: number
  recordsSkipped: number
  settingsAdded: number
}
