import { BookOpen, Save, X } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '../localization/i18n'
import type { SubmitEvent } from 'react'
import type {
  Category,
  Subject,
  StudyRecord,
  StudyRecordDraft,
} from '../types/study'

interface StudyRecordFormProps {
  defaultDate: string
  subjects: Subject[]
  categories: Category[]
  initialRecord?: StudyRecord
  onSave: (
    draft: StudyRecordDraft,
    existingRecord?: StudyRecord,
  ) => Promise<void>
  onCancel: () => void
}

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#789f82] focus:ring-2 focus:ring-[#789f82]/15'

const labelClass = 'text-xs font-medium text-slate-700'

export default function StudyRecordForm({
  defaultDate,
  subjects,
  categories,
  initialRecord,
  onSave,
  onCancel,
}: StudyRecordFormProps) {
  const { t } = useI18n()
  const [date, setDate] = useState(
    initialRecord?.date ?? defaultDate,
  )
const [subjectId, setSubjectId] = useState(
  initialRecord?.subjectId ?? '',
)

const UNCATEGORIZED_CATEGORY_ID = '__uncategorized__'

const [selectedCategoryId, setSelectedCategoryId] = useState(() => {
  const initialSubject = subjects.find(
    (subject) => subject.id === initialRecord?.subjectId,
  )

  return (
    initialSubject?.categoryId ??
    categories[0]?.id ??
    UNCATEGORIZED_CATEGORY_ID
  )
})

  const [topic, setTopic] = useState(initialRecord?.topic ?? '')
  const [source, setSource] = useState(initialRecord?.source ?? '')
  const [questionCount, setQuestionCount] = useState(
    initialRecord?.questionCount.toString() ?? '',
  )
  const [correctCount, setCorrectCount] = useState(
    initialRecord?.correctCount?.toString() ?? '',
  )
  const [incorrectCount, setIncorrectCount] = useState(
    initialRecord?.incorrectCount?.toString() ?? '',
  )
  const [blankCount, setBlankCount] = useState(
    initialRecord?.blankCount?.toString() ?? '',
  )
  const [notes, setNotes] = useState(initialRecord?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

const availableSubjects = subjects.filter((subject) => {
  if (selectedCategoryId === UNCATEGORIZED_CATEGORY_ID) {
    return !subject.categoryId
  }

  return subject.categoryId === selectedCategoryId
})

  const selectedSubjectId = availableSubjects.some(
    (subject) => subject.id === subjectId,
  )
    ? subjectId
    : (availableSubjects[0]?.id ?? '')

  function parseOptionalCount(
    value: string,
    fieldName: string,
  ): number | undefined {
    if (value.trim() === '') return undefined

    const parsed = Number(value)

    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error(t('recordForm.invalidCount').replace('{field}', fieldName))
    }

    return parsed
  }

    async function handleSubmit(
    event: SubmitEvent<HTMLFormElement>,
    ) {
    event.preventDefault()
    setError('')

    try {
    setSaving(true)
      if (!date) {
        throw new Error(t('recordForm.dateRequired'))
      }

      if (!selectedSubjectId) {
        throw new Error(t('recordForm.subjectRequired'))
      }

      if (!topic.trim()) {
        throw new Error(t('recordForm.topicRequired'))
      }

      if (questionCount.trim() === '') {
        throw new Error(t('recordForm.questionCountRequired'))
      }

      const total = Number(questionCount)

      if (!Number.isInteger(total) || total < 0) {
        throw new Error(
          t('recordForm.invalidQuestionCount'),
        )
      }

      const correct = parseOptionalCount(
        correctCount,
        t('recordForm.correctCount'),
      )
      const incorrect = parseOptionalCount(
        incorrectCount,
        t('recordForm.incorrectCount'),
      )
      const blank = parseOptionalCount(
        blankCount,
        t('recordForm.blankCount'),
      )

      const enteredCounts = [correct, incorrect, blank].filter(
        (value): value is number => value !== undefined,
      )

      if (enteredCounts.reduce((sum, value) => sum + value, 0) > total) {
        throw new Error(
          t('recordForm.distributionExceedsTotal'),
        )
      }

await onSave(
  {
    date,
    subjectId: selectedSubjectId,
    topic: topic.trim(),
    source: source.trim() || undefined,
    questionCount: total,
    correctCount: correct,
    incorrectCount: incorrect,
    blankCount: blank,
    notes: notes.trim() || undefined,
  },
  initialRecord,
)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t('recordForm.saveFailed'),
      )
    } finally {
        setSaving(false)
    }   
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-slate-100 p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#edf4ee] text-[#426b52]">
            <BookOpen size={19} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {initialRecord ? t('recordForm.editTitle') : t('recordForm.newTitle')}
            </h3>
            <p className="mt-1 text-[11px] text-slate-500">
              {t('recordForm.description')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          aria-label={t('recordForm.closeForm')}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
        >
          <X size={17} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="record-date" className={labelClass}>
            {t('recordForm.date')}
          </label>
          <input
            id="record-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
            className={inputClass}
          />
        </div>


<div>
  <label htmlFor="record-category" className={labelClass}>
    {t('recordForm.category')}
  </label>
  <select
    id="record-category"
    value={selectedCategoryId}
    onChange={(event) => {
      setSelectedCategoryId(event.target.value)
      setSubjectId('')
    }}
    className={inputClass}
  >
    {categories.map((category) => (
      <option key={category.id} value={category.id}>
        {category.name}
      </option>
    ))}
    <option value={UNCATEGORIZED_CATEGORY_ID}>
      {t('recordForm.uncategorized')}
    </option>
  </select>
</div>

<div>
  <label htmlFor="record-subject" className={labelClass}>
    {t('recordForm.subject')}
  </label>
  <select
    id="record-subject"
    value={selectedSubjectId}
    onChange={(event) => setSubjectId(event.target.value)}
    required
    disabled={availableSubjects.length === 0}
    className={inputClass}
  >
    <option value="" disabled>
      {availableSubjects.length === 0
        ? t('recordForm.noSubjectsInCategory')
        : t('recordForm.selectSubject')}
    </option>
    {availableSubjects.map((subject) => (
      <option key={subject.id} value={subject.id}>
        {subject.name}
      </option>
    ))}
  </select>
</div>


        <div>
          <label htmlFor="record-topic" className={labelClass}>
            {t('recordForm.topic')}
          </label>
          <input
            id="record-topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder={t('recordForm.topicPlaceholder')}
            required
            maxLength={150}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="record-source" className={labelClass}>
            {t('recordForm.source')} <span className="font-normal text-slate-400">({t('recordForm.optional')})</span>
          </label>
          <input
            id="record-source"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder={t('recordForm.sourcePlaceholder')}
            maxLength={150}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="record-total" className={labelClass}>
            {t('recordForm.questionCount')}
          </label>
          <input
            id="record-total"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={questionCount}
            onChange={(event) => setQuestionCount(event.target.value)}
            placeholder={t('recordForm.questionCountPlaceholder')}
            required
            className={inputClass}
          />
        </div>

        <div>
          <p className={labelClass}>
            {t('recordForm.resultDistribution')} <span className="font-normal text-slate-400">({t('recordForm.optional')})</span>
          </p>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="record-correct" className="text-[11px] text-slate-500">
                {t('recordForm.correctCount')}
              </label>
              <input
                id="record-correct"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={correctCount}
                onChange={(event) => setCorrectCount(event.target.value)}
                placeholder="—"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="record-incorrect" className="text-[11px] text-slate-500">
                {t('recordForm.incorrectCount')}
              </label>
              <input
                id="record-incorrect"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={incorrectCount}
                onChange={(event) => setIncorrectCount(event.target.value)}
                placeholder="—"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="record-blank" className="text-[11px] text-slate-500">
                {t('recordForm.blankCount')}
              </label>
              <input
                id="record-blank"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={blankCount}
                onChange={(event) => setBlankCount(event.target.value)}
                placeholder="—"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="record-notes" className={labelClass}>
            {t('recordForm.notes')} <span className="font-normal text-slate-400">({t('recordForm.optional')})</span>
          </label>
          <textarea
            id="record-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={t('recordForm.notesPlaceholder')}
            rows={3}
            maxLength={2000}
            className={inputClass}
          />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700"
        >
          {error}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {t('recordForm.cancel')}
        </button>

        <button
          type="submit"
          disabled={saving || availableSubjects.length === 0}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#244b38] px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#193b2a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={15} />
          {saving ? t('recordForm.saving') : initialRecord ? t('recordForm.saveChanges') : t('recordForm.saveRecord')}
        </button>
      </div>
    </form>
  )
}
