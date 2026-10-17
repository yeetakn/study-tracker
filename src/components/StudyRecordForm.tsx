import { BookOpen, Save, X } from 'lucide-react'
import { useState } from 'react'
import type { SubmitEvent } from 'react'
import type {
  ExamType,
  Subject,
  StudyRecord,
  StudyRecordDraft,
} from '../types/study'

interface StudyRecordFormProps {
  defaultDate: string
  subjects: Subject[]
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
  initialRecord,
  onSave,
  onCancel,
}: StudyRecordFormProps) {
  const [date, setDate] = useState(
    initialRecord?.date ?? defaultDate,
  )
  const [examType, setExamType] = useState<ExamType>(
    initialRecord?.examType ?? 'TYT',
  )
  const [subjectId, setSubjectId] = useState(
    initialRecord?.subjectId ?? '',
  )
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

  const availableSubjects = subjects.filter(
    (subject) => subject.examType === examType,
  )

const selectedSubjectId = availableSubjects.some(
  (subject) => subject.id === subjectId,
)
  ? subjectId
  : (availableSubjects[0]?.id ?? '')

  function changeExamType(nextType: ExamType) {
    setExamType(nextType)
    setSubjectId(
      subjects.find((subject) => subject.examType === nextType)?.id ?? '',
    )
  }

  function parseOptionalCount(
    value: string,
    fieldName: string,
  ): number | undefined {
    if (value.trim() === '') return undefined

    const parsed = Number(value)

    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error(`${fieldName} negatif olmayan bir tam sayı olmalıdır.`)
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
        throw new Error('Çalışma tarihi seçmelisin.')
      }

      if (!selectedSubjectId) {
      throw new Error('Bu sınav türü için önce bir ders gerekli.')
      }

      if (!topic.trim()) {
        throw new Error('Çalışılan konuyu girmelisin.')
      }

      if (questionCount.trim() === '') {
        throw new Error('Çözülen soru sayısını girmelisin.')
      }

      const total = Number(questionCount)

      if (!Number.isInteger(total) || total < 0) {
        throw new Error(
          'Çözülen soru sayısı negatif olmayan bir tam sayı olmalıdır.',
        )
      }

      const correct = parseOptionalCount(correctCount, 'Doğru sayısı')
      const incorrect = parseOptionalCount(incorrectCount, 'Yanlış sayısı')
      const blank = parseOptionalCount(blankCount, 'Boş sayısı')

      const enteredCounts = [correct, incorrect, blank].filter(
        (value): value is number => value !== undefined,
      )

      if (enteredCounts.reduce((sum, value) => sum + value, 0) > total) {
        throw new Error(
          'Doğru, yanlış ve boş sayılarının toplamı çözülen soru sayısını aşamaz.',
        )
      }

await onSave(
  {
    date,
    examType,
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
          : 'Kayıt kaydedilemedi. Tekrar deneyebilirsin.',
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
              {initialRecord ? 'Kaydı düzenle' : 'Yeni çalışma kaydı'}
            </h3>
            <p className="mt-1 text-[11px] text-slate-500">
              Alanları doldurup çalışmanı kaydet.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          aria-label="Formu kapat"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
        >
          <X size={17} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="record-date" className={labelClass}>
            Çalışma tarihi
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
          <label htmlFor="record-exam" className={labelClass}>
            Sınav türü
          </label>
          <select
            id="record-exam"
            value={examType}
            onChange={(event) =>
              changeExamType(event.target.value as ExamType)
            }
            className={inputClass}
          >
            <option value="TYT">TYT</option>
            <option value="AYT">AYT</option>
          </select>
        </div>

        <div>
          <label htmlFor="record-subject" className={labelClass}>
            Ders
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
              Ders seç
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
            Konu
          </label>
          <input
            id="record-topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Örn. Problemler"
            required
            maxLength={150}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="record-source" className={labelClass}>
            Kaynak / test adı <span className="font-normal text-slate-400">(isteğe bağlı)</span>
          </label>
          <input
            id="record-source"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="Örn. Deneme 4, Test 12"
            maxLength={150}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="record-total" className={labelClass}>
            Çözülen soru sayısı
          </label>
          <input
            id="record-total"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={questionCount}
            onChange={(event) => setQuestionCount(event.target.value)}
            placeholder="Örn. 40"
            required
            className={inputClass}
          />
        </div>

        <div>
          <p className={labelClass}>
            Sonuç dağılımı <span className="font-normal text-slate-400">(isteğe bağlı)</span>
          </p>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="record-correct" className="text-[11px] text-slate-500">
                Doğru
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
                Yanlış
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
                Boş
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
            Notlar <span className="font-normal text-slate-400">(isteğe bağlı)</span>
          </label>
          <textarea
            id="record-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Çalışmayla ilgili kısa not..."
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
          Vazgeç
        </button>

        <button
          type="submit"
          disabled={saving || availableSubjects.length === 0}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#244b38] px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#193b2a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={15} />
          {saving ? 'Kaydediliyor…' : initialRecord ? 'Değişiklikleri kaydet' : 'Kaydı kaydet'}
        </button>
      </div>
    </form>
  )
}
