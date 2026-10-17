
import { useEffect, useState } from 'react'
import {
  BookOpen,
  CalendarDays,
  Clock3,
  FileText,
  ArrowRight,
} from 'lucide-react'
import {
  endOfMonth,
  format,
  startOfMonth,
  subDays,
} from 'date-fns'
import { tr } from 'date-fns/locale'
import {
  getAllStudyRecords,
  getSubjects,
} from '../db/database'
import type { Subject, StudyRecord } from '../types/study'

interface OverviewPageProps {
  onNavigate: (page: 'calendar') => void
}

function localDateKey(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

function formatRecordDate(dateKey: string) {
  return format(new Date(`${dateKey}T12:00:00`), 'd MMM', {
    locale: tr,
  })
}

function formatMonth(date: Date) {
  const value = format(date, 'LLLL yyyy', { locale: tr })
  return value.charAt(0).toLocaleUpperCase('tr-TR') + value.slice(1)
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: string
  description: string
  icon: typeof BookOpen
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(20,35,55,0.025)] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-slate-600">{title}</p>
        <div className="flex size-9 items-center justify-center rounded-xl bg-[#edf4ee] text-[#426b52]">
          <Icon size={18} strokeWidth={1.8} />
        </div>
      </div>

      <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-2 text-[11px] text-slate-500">{description}</p>
    </section>
  )
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BookOpen
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center px-5 py-8 text-center">
      <div className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400">
        <Icon size={19} />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
      <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  )
}

export default function OverviewPage({
  onNavigate,
}: OverviewPageProps) {
  const [records, setRecords] = useState<StudyRecord[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [allRecords, allSubjects] = await Promise.all([
          getAllStudyRecords(),
          getSubjects(),
        ])

        if (!cancelled) {
          setRecords(allRecords)
          setSubjects(allSubjects)
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Çalışma verileri yüklenemedi.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [])

  const today = new Date()
  const monthStart = localDateKey(startOfMonth(today))
  const monthEnd = localDateKey(endOfMonth(today))
  const monthLabel = formatMonth(today)

  const monthRecords = records.filter(
    (record) => record.date >= monthStart && record.date <= monthEnd,
  )

  const totalQuestions = monthRecords.reduce(
    (total, record) => total + record.questionCount,
    0,
  )

  const tytQuestions = monthRecords
    .filter((record) => record.examType === 'TYT')
    .reduce((total, record) => total + record.questionCount, 0)

  const aytQuestions = monthRecords
    .filter((record) => record.examType === 'AYT')
    .reduce((total, record) => total + record.questionCount, 0)

  const studyDayCount = new Set(
    monthRecords.map((record) => record.date),
  ).size

  const subjectById = new Map(
    subjects.map((subject) => [subject.id, subject]),
  )

  const subjectTotals = subjects
    .map((subject) => ({
      subject,
      questions: monthRecords
        .filter((record) => record.subjectId === subject.id)
        .reduce((total, record) => total + record.questionCount, 0),
    }))
    .filter((item) => item.questions > 0)
    .sort((a, b) => b.questions - a.questions)

  const largestSubjectTotal = Math.max(
    1,
    ...subjectTotals.map((item) => item.questions),
  )

  const topicMap = new Map<
    string,
    {
      topic: string
      subjectId: string
      examType: StudyRecord['examType']
      questions: number
      records: number
    }
  >()

  for (const record of monthRecords) {
    const normalizedTopic = record.topic.trim().toLocaleLowerCase('tr-TR')
    const key = `${record.subjectId}|${normalizedTopic}`
    const existing = topicMap.get(key)

    if (existing) {
      existing.questions += record.questionCount
      existing.records += 1
    } else {
      topicMap.set(key, {
        topic: record.topic,
        subjectId: record.subjectId,
        examType: record.examType,
        questions: record.questionCount,
        records: 1,
      })
    }
  }

  const topTopics = Array.from(topicMap.values())
    .sort((a, b) => b.questions - a.questions)
    .slice(0, 5)

  const dailyTotals = new Map<string, number>()

  for (const record of records) {
    dailyTotals.set(
      record.date,
      (dailyTotals.get(record.date) ?? 0) + record.questionCount,
    )
  }

  const dailyHistory = Array.from({ length: 7 }, (_, index) => {
    const date = subDays(today, 6 - index)
    const key = localDateKey(date)

    return {
      key,
      label: format(date, 'EEE', { locale: tr }),
      questions: dailyTotals.get(key) ?? 0,
      today: key === localDateKey(today),
    }
  })

  const largestDailyTotal = Math.max(
    1,
    ...dailyHistory.map((day) => day.questions),
  )

  const recentRecords = [...records]
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, 5)

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[24px] bg-[#172438] px-6 py-8 text-white sm:px-9 sm:py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-24 size-64 rounded-full border border-white/[0.07] sm:size-80"
        />
        <div className="relative max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5">
            <span className="size-1.5 rounded-full bg-[#a7d0b1]" />
            <span className="text-[10px] font-medium tracking-wide text-slate-200">
              KİŞİSEL ÇALIŞMA ALANIN
            </span>
          </div>

          <h2 className="mt-5 text-2xl font-semibold leading-tight tracking-tight sm:text-[30px]">
            Acta, non verba.
          </h2>

          <p className="mt-3 max-w-lg text-[13px] leading-6 text-slate-300">
            {monthLabel} çalışma özeti. Çözdüğün soruları, çalıştığın
            dersleri ve son kayıtlarını buradan takip edebilirsin.
          </p>

          <button
            type="button"
            onClick={() => onNavigate('calendar')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#dcebe0] px-4 py-3 text-xs font-semibold text-[#244b38] transition-colors hover:bg-white"
          >
            Çalışma kaydı ekle
            <ArrowRight size={15} />
          </button>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold tracking-tight text-slate-900">
            {monthLabel} çalışma özeti
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Yalnızca seçilen ay içindeki gerçek kayıtlar.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            title="Çözülen soru"
            value={loading ? '…' : totalQuestions.toLocaleString('tr-TR')}
            description="Bu ay toplam"
            icon={BookOpen}
          />
          <MetricCard
            title="Çalışılan gün"
            value={loading ? '…' : String(studyDayCount)}
            description="Kayıt bulunan farklı gün"
            icon={CalendarDays}
          />
          <MetricCard
            title="Çalışma kaydı"
            value={loading ? '…' : String(monthRecords.length)}
            description="Bu ay oluşturulan kayıt"
            icon={Clock3}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
          <p className="text-xs font-medium text-slate-500">TYT soru toplamı</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            {loading ? '…' : tytQuestions.toLocaleString('tr-TR')}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Bu ay çözülen TYT soruları
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
          <p className="text-xs font-medium text-slate-500">AYT soru toplamı</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            {loading ? '…' : aytQuestions.toLocaleString('tr-TR')}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Bu ay çözülen AYT soruları
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-slate-900">
              Derslere göre dağılım
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              {monthLabel} çözülen soru sayıları
            </p>
          </div>

          {loading ? (
            <p className="p-6 text-sm text-slate-500">Veriler yükleniyor…</p>
          ) : subjectTotals.length === 0 ? (
            <EmptyPanel
              icon={BookOpen}
              title="Henüz ders verisi yok"
              description="Kayıt ekledikçe ders bazındaki soru dağılımı burada görünecek."
            />
          ) : (
            <div className="space-y-5 p-5 sm:p-6">
              {subjectTotals.map(({ subject, questions }) => (
                <div key={subject.id}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-slate-800">
                        {subject.name}
                      </span>
                      <span className="ml-2 text-[10px] text-slate-400">
                        {subject.examType}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-700">
                      {questions.toLocaleString('tr-TR')}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#648a6d] transition-all"
                      style={{
                        width: `${(questions / largestSubjectTotal) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-slate-900">
              En çok çalışılan konular
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              Bu ay konu bazında çözülen sorular
            </p>
          </div>

          {loading ? (
            <p className="p-6 text-sm text-slate-500">Veriler yükleniyor…</p>
          ) : topTopics.length === 0 ? (
            <EmptyPanel
              icon={FileText}
              title="Henüz konu verisi yok"
              description="Çalışma konuların kaydedildikçe burada listelenecek."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {topTopics.map((topic, index) => (
                <div
                  key={`${topic.subjectId}-${topic.topic}`}
                  className="flex items-start gap-3 px-5 py-4 sm:px-6"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#edf4ee] text-[11px] font-semibold text-[#426b52]">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="break-words text-xs font-semibold text-slate-800">
                      {topic.topic}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {subjectById.get(topic.subjectId)?.name ?? 'Bilinmeyen ders'}
                      {' · '}
                      {topic.examType}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold tabular-nums text-slate-800">
                      {topic.questions.toLocaleString('tr-TR')}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">soru</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-900">
            Son 7 günlük çalışma
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Günlere göre çözülen soru sayısı
          </p>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-slate-500">Veriler yükleniyor…</p>
        ) : (
          <div className="space-y-4 p-5 sm:p-6">
            {dailyHistory.map((day) => (
              <div
                key={day.key}
                className="grid grid-cols-[42px_minmax(0,1fr)_60px] items-center gap-3"
              >
                <span
                  className={`text-xs ${
                    day.today
                      ? 'font-semibold text-[#315b3d]'
                      : 'text-slate-500'
                  }`}
                >
                  {day.today ? 'Bugün' : day.label}
                </span>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#648a6d]"
                    style={{
                      width: `${(day.questions / largestDailyTotal) * 100}%`,
                    }}
                  />
                </div>

                <span className="text-right text-xs tabular-nums text-slate-600">
                  {day.questions.toLocaleString('tr-TR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Son çalışmalar
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              En son kaydedilen çalışma kayıtların
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('calendar')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#426b52] hover:text-[#244b38]"
          >
            Takvimi aç
            <ArrowRight size={14} />
          </button>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-slate-500">Veriler yükleniyor…</p>
        ) : recentRecords.length === 0 ? (
          <EmptyPanel
            icon={Clock3}
            title="Henüz çalışma kaydı yok"
            description="Takvimden bir gün seçip ilk kaydını eklediğinde geçmişin burada görünecek."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {recentRecords.map((record) => (
              <div
                key={record.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[#edf4ee] px-2 py-1 text-[10px] font-semibold text-[#315b3d]">
                      {record.examType}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {subjectById.get(record.subjectId)?.name ?? 'Bilinmeyen ders'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatRecordDate(record.date)}
                    </span>
                  </div>
                  <p className="mt-2 break-words text-sm font-medium text-slate-800">
                    {record.topic}
                  </p>
                  {record.source && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      {record.source}
                    </p>
                  )}
                </div>

                <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                  {record.questionCount.toLocaleString('tr-TR')}
                  <span className="ml-1 text-[10px] font-normal text-slate-500">
                    soru
                  </span>
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
