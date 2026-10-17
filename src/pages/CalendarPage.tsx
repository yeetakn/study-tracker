
import { useEffect, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { tr } from 'date-fns/locale'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import StudyRecordForm from '../components/StudyRecordForm'
import {
  deleteStudyRecord,
  getStudyRecordsByDate,
  getStudyRecordsForDateRange,
  getSubjects,
  saveStudyRecord,
} from '../db/database'
import type {
  Subject,
  StudyRecord,
  StudyRecordDraft,
} from '../types/study'

const weekdays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

function capitalizeFirst(value: string) {
  return value.charAt(0).toLocaleUpperCase('tr-TR') + value.slice(1)
}

function formatDate(date: Date) {
  return capitalizeFirst(
    format(date, 'EEEE, d MMMM yyyy', { locale: tr }),
  )
}

// YYYY-MM-DD değerini UTC'ye çevirmeden yerel tarihe dönüştür.
function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'İşlem tamamlanamadı. Lütfen tekrar dene.'
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(new Date()),
  )
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedRecords, setSelectedRecords] = useState<StudyRecord[]>([])
  const [monthRecords, setMonthRecords] = useState<StudyRecord[]>([])
  const [editingRecord, setEditingRecord] = useState<StudyRecord | undefined>()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)

  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd')
  const calendarStart = startOfWeek(startOfMonth(currentMonth), {
    weekStartsOn: 1,
  })
  const calendarEnd = endOfWeek(endOfMonth(currentMonth), {
    weekStartsOn: 1,
  })
  const calendarStartKey = format(calendarStart, 'yyyy-MM-dd')
  const calendarEndKey = format(calendarEnd, 'yyyy-MM-dd')

  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  })

  useEffect(() => {
    let cancelled = false

    async function loadSubjects() {
      try {
        const result = await getSubjects()
        if (!cancelled) setSubjects(result)
      } catch (caught) {
        if (!cancelled) setError(getErrorMessage(caught))
      }
    }

    void loadSubjects()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadCalendarRecords() {
      try {
        const result = await getStudyRecordsForDateRange(
          calendarStartKey,
          calendarEndKey,
        )
        if (!cancelled) setMonthRecords(result)
      } catch (caught) {
        if (!cancelled) setError(getErrorMessage(caught))
      }
    }

    void loadCalendarRecords()

    return () => {
      cancelled = true
    }
  }, [calendarStartKey, calendarEndKey, refreshToken])

  useEffect(() => {
    let cancelled = false

    async function loadSelectedDate() {
      setLoading(true)
      setError('')

      try {
        const result = await getStudyRecordsByDate(selectedDateKey)
        if (!cancelled) setSelectedRecords(result)
      } catch (caught) {
        if (!cancelled) setError(getErrorMessage(caught))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadSelectedDate()

    return () => {
      cancelled = true
    }
  }, [selectedDateKey, refreshToken])

  function changeMonth(direction: 'previous' | 'next') {
    setCurrentMonth((month) =>
      direction === 'previous' ? subMonths(month, 1) : addMonths(month, 1),
    )
    setMessage('')
  }

  function selectDate(date: Date) {
    setSelectedDate(date)
    setShowForm(false)
    setEditingRecord(undefined)
    setMessage('')
    setError('')

    if (!isSameMonth(date, currentMonth)) {
      setCurrentMonth(startOfMonth(date))
    }
  }

  async function handleSave(
    draft: StudyRecordDraft,
    existingRecord?: StudyRecord,
  ) {
    const saved = await saveStudyRecord(draft, existingRecord)
    const savedDate = dateFromKey(saved.date)

    setSelectedDate(savedDate)
    setCurrentMonth(startOfMonth(savedDate))
    setEditingRecord(undefined)
    setShowForm(false)
    setMessage(
      existingRecord
        ? 'Çalışma kaydı güncellendi.'
        : 'Çalışma kaydı başarıyla eklendi.',
    )
    setRefreshToken((value) => value + 1)
  }

  async function handleDelete(record: StudyRecord) {
    const confirmed = window.confirm(
      `"${record.topic}" çalışma kaydı silinsin mi? Bu işlem geri alınamaz.`,
    )

    if (!confirmed) return

    try {
      await deleteStudyRecord(record.id)

      if (editingRecord?.id === record.id) {
        setEditingRecord(undefined)
        setShowForm(false)
      }

      setError('')
      setMessage('Çalışma kaydı silindi.')
      setRefreshToken((value) => value + 1)
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }

  function startEditing(record: StudyRecord) {
    setEditingRecord(record)
    setShowForm(true)
    setMessage('')
    setError('')
  }

  function startCreating() {
    setEditingRecord(undefined)
    setShowForm(true)
    setMessage('')
    setError('')
  }

  const datesWithRecords = new Set(
    monthRecords.map((record) => record.date),
  )

  const subjectName = (record: StudyRecord) =>
    subjects.find((subject) => subject.id === record.subjectId)?.name ??
    'Bilinmeyen ders'

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Çalışma takvimi
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Bir gün seç, çalışmalarını kaydet ve geçmişini düzenle.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-xl border border-[#d5e5d8] bg-[#eef5ef] px-4 py-3 text-sm text-[#315b3d]"
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
        <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_10px_rgba(20,35,55,0.025)] sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                AYLIK GÖRÜNÜM
              </p>
              <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                {capitalizeFirst(
                  format(currentMonth, 'LLLL yyyy', { locale: tr }),
                )}
              </h3>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => changeMonth('previous')}
                aria-label="Önceki ay"
                className="flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
              >
                <ChevronLeft size={19} />
              </button>
              <button
                type="button"
                onClick={() => changeMonth('next')}
                aria-label="Sonraki ay"
                className="flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
              >
                <ChevronRight size={19} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {weekdays.map((day) => (
              <div
                key={day}
                className="pb-3 text-center text-[10px] font-semibold text-slate-400 sm:text-xs"
              >
                {day}
              </div>
            ))}

            {days.map((day) => {
              const selected = isSameDay(day, selectedDate)
              const today = isToday(day)
              const inMonth = isSameMonth(day, currentMonth)
              const dayKey = format(day, 'yyyy-MM-dd')
              const hasRecords = datesWithRecords.has(dayKey)

              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => selectDate(day)}
                  aria-label={`${formatDate(day)}${hasRecords ? ', çalışma kaydı var' : ''}`}
                  aria-pressed={selected}
                  className={[
                    'relative flex aspect-square min-w-0 flex-col items-center justify-center rounded-xl text-xs transition-colors sm:text-sm',
                    selected
                      ? 'bg-[#172438] font-semibold text-white'
                      : inMonth
                        ? 'text-slate-700 hover:bg-[#edf4ee]'
                        : 'text-slate-300 hover:bg-slate-50',
                    today && !selected
                      ? 'font-semibold ring-1 ring-inset ring-[#8eb49a]'
                      : '',
                  ].join(' ')}
                >
                  <span>{format(day, 'd')}</span>
                  {hasRecords && (
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-1 size-1 rounded-full ${
                        selected ? 'bg-[#b9ddc0]' : 'bg-[#598565]'
                      }`}
                    />
                  )}
                  {today && !hasRecords && (
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-1 size-1 rounded-full ${
                        selected ? 'bg-[#b9ddc0]' : 'bg-[#8eb49a]'
                      }`}
                    />
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="size-2.5 rounded-full bg-[#172438]" />
              Seçili gün
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="size-2.5 rounded-full border border-[#8eb49a]" />
              Bugün
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="size-2.5 rounded-full bg-[#598565]" />
              Kayıt bulunan gün
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <div className="bg-[#172438] px-5 py-5 text-white sm:px-6">
            <div className="flex items-center gap-2 text-[#d0e4d5]">
              <CalendarDays size={16} />
              <span className="text-[10px] font-semibold tracking-[0.14em]">
                SEÇİLİ TARİH
              </span>
            </div>

            <h3 className="mt-3 text-lg font-semibold leading-snug">
              {formatDate(selectedDate)}
            </h3>

            {isToday(selectedDate) && (
              <span className="mt-3 inline-flex rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] text-slate-200">
                Bugün
              </span>
            )}
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">
                  Günlük çalışma
                </h4>
                <p className="mt-1 text-[11px] text-slate-500">
                  {loading
                    ? 'Kayıtlar yükleniyor…'
                    : `${selectedRecords.length} kayıt`}
                </p>
              </div>

              <button
                type="button"
                onClick={startCreating}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#244b38] px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#193b2a]"
              >
                <Plus size={15} />
                Kayıt ekle
              </button>
            </div>

            {!loading && selectedRecords.length === 0 && (
              <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-[#fafbf9] px-4 py-7 text-center">
                <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                  <CalendarDays size={19} />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">
                  Henüz kayıt bulunmuyor
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Bu güne ait ilk çalışma kaydını ekleyebilirsin.
                </p>
              </div>
            )}

            <div className="mt-4 space-y-3">
              {selectedRecords.map((record) => {
                const resultCounts = [
                  record.correctCount !== undefined
                    ? `Doğru ${record.correctCount}`
                    : null,
                  record.incorrectCount !== undefined
                    ? `Yanlış ${record.incorrectCount}`
                    : null,
                  record.blankCount !== undefined
                    ? `Boş ${record.blankCount}`
                    : null,
                ].filter((value): value is string => value !== null)

                return (
                  <article
                    key={record.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-[#edf4ee] px-2 py-1 text-[10px] font-semibold text-[#315b3d]">
                            {record.examType}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {subjectName(record)}
                          </span>
                        </div>
                        <h5 className="mt-2 break-words text-sm font-semibold text-slate-900">
                          {record.topic}
                        </h5>
                        {record.source && (
                          <p className="mt-1 break-words text-[11px] text-slate-500">
                            {record.source}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-lg font-semibold tracking-tight text-slate-900">
                          {record.questionCount}
                        </p>
                        <p className="text-[10px] text-slate-500">soru</p>
                      </div>
                    </div>

                    {resultCounts.length > 0 && (
                      <p className="mt-3 text-[11px] text-slate-600">
                        {resultCounts.join(' · ')}
                      </p>
                    )}

                    {record.notes && (
                      <div className="mt-3 flex items-start gap-2 border-t border-slate-100 pt-3">
                        <FileText
                          size={14}
                          className="mt-0.5 shrink-0 text-slate-400"
                        />
                        <p className="whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">
                          {record.notes}
                        </p>
                      </div>
                    )}

                    <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => startEditing(record)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        <Pencil size={13} />
                        Düzenle
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(record)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={13} />
                        Sil
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>

          {showForm && (
            <StudyRecordForm
              key={`${selectedDateKey}-${editingRecord?.id ?? 'new'}`}
              defaultDate={selectedDateKey}
              subjects={subjects}
              initialRecord={editingRecord}
              onSave={handleSave}
              onCancel={() => {
                setShowForm(false)
                setEditingRecord(undefined)
              }}
            />
          )}

          <div className="border-t border-slate-100 px-5 py-3 sm:px-6">
            <p className="flex items-start gap-2 text-[10px] leading-5 text-slate-400">
              <Clock3 size={13} className="mt-0.5 shrink-0" />
              Kayıtlar bu tarayıcıda, bilgisayarında saklanır. Düzenli yedek almayı unutma.
            </p>
          </div>
        </section>
      </div>
    </section>
  )
}
