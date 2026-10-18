/** Legacy exam labels kept only to read and preserve existing data. */
export type ExamType = 'TYT' | 'AYT'

export interface Category {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Subject {
  id: string
  name: string
  /** Missing for older records until migrated; custom subjects may be uncategorized. */
  categoryId?: string
  /** Backward-compatibility field for old TYT/AYT data. */
  examType?: ExamType
  createdAt: string
}

export interface StudyRecord {
  id: string
  date: string
  /** Legacy value retained when it existed in a pre-category record. */
  examType?: ExamType
  subjectId: string
  topic: string
  source?: string
  questionCount: number
  correctCount?: number
  incorrectCount?: number
  blankCount?: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export type StudyRecordDraft = Omit<
  StudyRecord,
  'id' | 'createdAt' | 'updatedAt'
>

export interface AppSetting {
  key: string
  value: string | number | boolean | null
  updatedAt: string
}
