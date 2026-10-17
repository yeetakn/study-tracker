export type ExamType = 'TYT' | 'AYT'

export interface Subject {
  id: string
  name: string
  examType: ExamType
  createdAt: string
}

export interface StudyRecord {
  id: string
  date: string
  examType: ExamType
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