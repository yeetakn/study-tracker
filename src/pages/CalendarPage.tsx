
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
import { enUS, tr } from 'date-fns/locale'
import { useI18n, type Language } from '../localization/i18n'
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
  getCategories,
  getSubjects,
  saveStudyRecord,
} from '../db/database'
import type {
  Category,
  Subject,
  StudyRecord,
  StudyRecordDraft,
} from '../types/study'

function getDateLocale(language: Language) {
  return language === 'tr' ? tr : enUS
}

function getNumberLocale(language: Language) {
  return language === 'tr' ? 'tr-TR' : 'en-US'
}

function capitalizeFirst(value: string, language: Language) {
  return value.charAt(0).toLocaleUpperCase(getNumberLocale(language)) + value.slice(1)
}

function formatDate(date: Date, language: Language) {
  return capitalizeFirst(
    format(date, 'EEEE, d MMMM yyyy', { locale: getDateLocale(language) }),
    language,
  )
}

// YYYY-MM-DD değerini UTC'ye çevirmeden yerel tarihe dönüştür.
function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage
}

export default function CalendarPage() {
  const { language, t } = useI18n()
  const weekdays = language === 'tr'
    ? ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(new Date()),
  )
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [categories, setCategories] = useState<Category[]>([])
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
        const [result, loadedCategories] = await Promise.all([getSubjects(), getCategories()])
        if (!cancelled) {
          setSubjects(result)
          setCategories(loadedCategories)
        }
      } catch (caught) {
        if (!cancelled) setError(getErrorMessage(caught, t('calendar.genericError')))
      }
    }

    void loadSubjects()

    return () => {
      cancelled = true
    }
  }, [t])

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
        if (!cancelled) setError(getErrorMessage(caught, t('calendar.genericError')))
      }
    }

    void loadCalendarRecords()

    return () => {
      cancelled = true
    }
  }, [calendarStartKey, calendarEndKey, refreshToken, t])

  useEffect(() => {
    let cancelled = false

    async function loadSelectedDate() {
      setLoading(true)
      setError('')

      try {
        const result = await getStudyRecordsByDate(selectedDateKey)
        if (!cancelled) setSelectedRecords(result)
      } catch (caught) {
        if (!cancelled) setError(getErrorMessage(caught, t('calendar.genericError')))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadSelectedDate()

    return () => {
      cancelled = true
    }
  }, [selectedDateKey, refreshToken, t])

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
        ? t('calendar.updateSuccess')
        : t('calendar.addSuccess'),
    )
    setRefreshToken((value) => value + 1)
  }

  async function handleDelete(record: StudyRecord) {
    const confirmed = window.confirm(
      `${t('calendar.deleteConfirmPrefix')}${record.topic}${t('calendar.deleteConfirmSuffix')}`,
    )

    if (!confirmed) return

    try {
      await deleteStudyRecord(record.id)

      if (editingRecord?.id === record.id) {
        setEditingRecord(undefined)
        setShowForm(false)
      }

      setError('')
      setMessage(t('calendar.deleteSuccess'))
      setRefreshToken((value) => value + 1)
    } catch (caught) {
      setError(getErrorMessage(caught, t('calendar.genericError')))
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
    t('calendar.unknownSubject')
  const categoryName = (record: StudyRecord) => {
    const subject = subjects.find((item) => item.id === record.subjectId)
    return categories.find((category) => category.id === subject?.categoryId)?.name ?? t('calendar.uncategorized')
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          {t('calendar.title')}
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {t('calendar.subtitle')}
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
                {t('calendar.monthlyView')}
              </p>
              <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                {capitalizeFirst(
                  format(currentMonth, 'LLLL yyyy', { locale: getDateLocale(language) }),
                  language,
                )}
              </h3>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => changeMonth('previous')}
                aria-label={t('calendar.previousMonth')}
                className="flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
              >
                <ChevronLeft size={19} />
              </button>
              <button
                type="button"
                onClick={() => changeMonth('next')}
                aria-label={t('calendar.nextMonth')}
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
                  aria-label={`${formatDate(day, language)}${hasRecords ? `, ${t('calendar.hasRecords')}` : ''}`}
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
              {t('calendar.selectedDay')}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="size-2.5 rounded-full border border-[#8eb49a]" />
              {t('calendar.today')}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="size-2.5 rounded-full bg-[#598565]" />
              {t('calendar.dayWithRecords')}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <div className="bg-[#172438] px-5 py-5 text-white sm:px-6">
            <div className="flex items-center gap-2 text-[#d0e4d5]">
              <CalendarDays size={16} />
              <span className="text-[10px] font-semibold tracking-[0.14em]">
                {t('calendar.selectedDate')}
              </span>
            </div>

            <h3 className="mt-3 text-lg font-semibold leading-snug">
              {formatDate(selectedDate, language)}
            </h3>

            {isToday(selectedDate) && (
              <span className="mt-3 inline-flex rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] text-slate-200">
                {t('calendar.today')}
              </span>
            )}
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">
                  {t('calendar.dailyStudy')}
                </h4>
                <p className="mt-1 text-[11px] text-slate-500">
                  {loading
                    ? t('calendar.loadingRecords')
                    : `${selectedRecords.length} ${selectedRecords.length === 1 ? t('calendar.recordSingular') : t('calendar.recordPlural')}`}
                </p>
              </div>

              <button
                type="button"
                onClick={startCreating}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#244b38] px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#193b2a]"
              >
                <Plus size={15} />
                {t('calendar.addRecord')}
              </button>
            </div>

            {!loading && selectedRecords.length === 0 && (
              <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-[#fafbf9] px-4 py-7 text-center">
                <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                  <CalendarDays size={19} />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">
                  {t('calendar.noRecords')}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {t('calendar.addFirstRecord')}
                </p>
              </div>
            )}

            <div className="mt-4 space-y-3">
              {selectedRecords.map((record) => {
                const resultCounts = [
                  record.correctCount !== undefined
                    ? `${t('calendar.correct')} ${record.correctCount}`
                    : null,
                  record.incorrectCount !== undefined
                    ? `${t('calendar.incorrect')} ${record.incorrectCount}`
                    : null,
                  record.blankCount !== undefined
                    ? `${t('calendar.blank')} ${record.blankCount}`
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
                            {categoryName(record)}
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
                          {record.questionCount.toLocaleString(getNumberLocale(language))}
                        </p>
                        <p className="text-[10px] text-slate-500">{t('calendar.questions')}</p>
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
                        {t('calendar.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(record)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={13} />
                        {t('calendar.delete')}
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
              categories={categories}
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
              {t('calendar.localStorageNotice')}
            </p>
          </div>
        </section>
      </div>
    </section>
  )
}
