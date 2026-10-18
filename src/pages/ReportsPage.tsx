
import { useEffect, useState } from 'react'
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns'
import { enUS, tr } from 'date-fns/locale'
import { useI18n } from '../localization/i18n'
import { Download, FileText, Printer } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  getStudyRecordsForDateRange,
  getCategories,
  getSubjects,
} from '../db/database'
import type { Category, Subject, StudyRecord } from '../types/study'

type ReportType = 'daily' | 'weekly' | 'fortnightly' | 'monthly' | 'custom'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#789f82] focus:ring-2 focus:ring-[#789f82]/15'

function dateKey(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

function dateFromKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

function dateLabel(value: string, language: 'tr' | 'en') {
  return format(dateFromKey(value), 'd MMMM yyyy', { locale: language === 'tr' ? tr : enUS })
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function getPresetRange(type: ReportType, today = new Date()) {
  switch (type) {
    case 'daily':
      return { start: today, end: today }

    case 'weekly':
      return {
        start: startOfWeek(today, { weekStartsOn: 1 }),
        end: endOfWeek(today, { weekStartsOn: 1 }),
      }

    case 'fortnightly':
      return {
        start: startOfWeek(subDays(today, 7), { weekStartsOn: 1 }),
        end: endOfWeek(today, { weekStartsOn: 1 }),
      }

    case 'monthly':
      return {
        start: startOfMonth(today),
        end: endOfMonth(today),
      }

    case 'custom':
      return {
        start: startOfMonth(today),
        end: today,
      }
  }
}

function getReportTitle(type: ReportType, t: (key: import('../localization/i18n').TranslationKey) => string) {
  const titles: Record<ReportType, import('../localization/i18n').TranslationKey> = {
    daily: 'reports.titleDaily', weekly: 'reports.titleWeekly',
    fortnightly: 'reports.titleFortnightly', monthly: 'reports.titleMonthly', custom: 'reports.titleCustom',
  }
  return t(titles[type])
}

async function loadFontAsBase64(path: string): Promise<string> {
  const response = await fetch(path)

  if (!response.ok) {
    throw new Error(
      `Font dosyası yüklenemedi: ${path}. public/fonts klasörünü ve dosya adlarını kontrol et.`,
    )
  }

  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const chunks: string[] = []
  const chunkSize = 0x8000

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    chunks.push(
      String.fromCharCode(...bytes.subarray(offset, offset + chunkSize)),
    )
  }

  return btoa(chunks.join(''))
}

async function registerUnicodeFonts(pdf: jsPDF) {
  const fontDirectory = `${import.meta.env.BASE_URL}fonts/`

  const [regularFont, boldFont] = await Promise.all([
    loadFontAsBase64(`${fontDirectory}Roboto-Regular.ttf`),
    loadFontAsBase64(`${fontDirectory}Roboto-Bold.ttf`),
  ])

  pdf.addFileToVFS('Roboto-Regular.ttf', regularFont)
  pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')

  pdf.addFileToVFS('Roboto-Bold.ttf', boldFont)
  pdf.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
}

interface ReportsPageProps {
  onNavigate?: (page: 'calendar') => void
}

export default function ReportsPage({ onNavigate }: ReportsPageProps) {
  const { language, t } = useI18n()
  const today = new Date()
  const initialRange = getPresetRange('monthly', today)

  const [reportType, setReportType] = useState<ReportType>('monthly')
  const [startDate, setStartDate] = useState(dateKey(initialRange.start))
  const [endDate, setEndDate] = useState(dateKey(initialRange.end))
  const [includeNotes, setIncludeNotes] = useState(false)

  const [records, setRecords] = useState<StudyRecord[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const validRange =
    Boolean(startDate && endDate) && startDate <= endDate

  useEffect(() => {
    let cancelled = false

    async function loadReportData() {
      setLoading(true)
      setError('')
      setSuccess('')

      if (!validRange) {
        setRecords([])
        setLoading(false)
        setError(t('reports.invalidRange'))
        return
      }

      try {
        const [loadedRecords, loadedSubjects, loadedCategories] = await Promise.all([
          getStudyRecordsForDateRange(startDate, endDate),
          getSubjects(),
          getCategories(),
        ])

        if (cancelled) return

        loadedRecords.sort(
          (a, b) =>
            a.date.localeCompare(b.date) ||
            a.createdAt.localeCompare(b.createdAt),
        )

        setRecords(loadedRecords)
        setSubjects(loadedSubjects)
        setCategories(loadedCategories)
      } catch (caught) {
        if (!cancelled) setError(errorMessage(caught, t('reports.genericError')))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadReportData()

    return () => {
      cancelled = true
    }
  }, [startDate, endDate, validRange, t])

  function selectReportType(nextType: ReportType) {
    setReportType(nextType)
    setSuccess('')
    setError('')

    if (nextType !== 'custom') {
      const range = getPresetRange(nextType)
      setStartDate(dateKey(range.start))
      setEndDate(dateKey(range.end))
    }
  }

  function editStartDate(value: string) {
    setStartDate(value)
    setReportType('custom')
  }

  function editEndDate(value: string) {
    setEndDate(value)
    setReportType('custom')
  }

  const subjectById = new Map(
    subjects.map((subject) => [subject.id, subject]),
  )
  const categoryNameById = new Map(
    categories.map((category) => [category.id, category.name]),
  )
  const categoryLabelForSubject = (subject?: Subject) =>
    subject?.categoryId ? categoryNameById.get(subject.categoryId) ?? t('reports.uncategorized') : t('reports.uncategorized')
  const activeStudyDayCount = new Set(records.map((record) => record.date)).size

  const totalQuestions = records.reduce(
    (sum, record) => sum + record.questionCount,
    0,
  )

  const subjectSummary = subjects
    .map((subject) => ({
      subject,
      questions: records
        .filter((record) => record.subjectId === subject.id)
        .reduce((sum, record) => sum + record.questionCount, 0),
    }))
    .filter((item) => item.questions > 0)
    .sort((a, b) => b.questions - a.questions)

  const reportTitle = getReportTitle(reportType, t)
  const rangeDescription =
    validRange
      ? `${dateLabel(startDate, language)} – ${dateLabel(endDate, language)}`
      : t('reports.invalidDateRange')

  async function downloadPdf() {
    if (!validRange) {
      setError(t('reports.selectValidRange'))
      return
    }

    setGenerating(true)
    setError('')
    setSuccess('')

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      })

      await registerUnicodeFonts(pdf)

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 14
      const generatedAt = format(new Date(), 'd MMMM yyyy, HH:mm', {
        locale: language === 'tr' ? tr : enUS,
      })

      pdf.setProperties({
        title: reportTitle,
        subject: rangeDescription,
        author: 'Çalışma Defteri',
        creator: 'Çalışma Defteri',
      })

      pdf.setFont('Roboto', 'bold')
      pdf.setFontSize(19)
      pdf.setTextColor(23, 36, 56)
      pdf.text(reportTitle, margin, 17)

      pdf.setFont('Roboto', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(95, 106, 119)
      pdf.text(`${t('reports.dateRange')}: ${rangeDescription}`, margin, 24)
      pdf.text(`${t('reports.generatedDate')}: ${generatedAt}`, pageWidth - margin, 24, {
        align: 'right',
      })

      const metrics = [
        { label: t('reports.totalQuestions'), value: totalQuestions },
        { label: t('reports.subjectCount'), value: subjectSummary.length },
        { label: t('reports.recordCount'), value: records.length },
        { label: t('reports.studyDays'), value: activeStudyDayCount },
      ]

      const gap = 4
      const cardY = 30
      const cardHeight = 21
      const cardWidth = (pageWidth - margin * 2 - gap * 3) / 4

      metrics.forEach((metric, index) => {
        const x = margin + index * (cardWidth + gap)

        pdf.setDrawColor(225, 231, 226)
        pdf.setFillColor(246, 248, 246)
        pdf.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, 'FD')

        pdf.setFont('Roboto', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(95, 106, 119)
        pdf.text(metric.label, x + 4, cardY + 7)

        pdf.setFont('Roboto', 'bold')
        pdf.setFontSize(14)
        pdf.setTextColor(36, 75, 56)
        pdf.text(
          metric.value.toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US'),
          x + 4,
          cardY + 16,
        )
      })

      pdf.setFont('Roboto', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(23, 36, 56)
      pdf.text(t('reports.subjectSummary'), margin, 59)

      autoTable(pdf, {
        startY: 63,
        margin: { left: margin, right: margin, bottom: 17 },
        tableWidth: 132,
        head: [[t('reports.subject'), t('reports.category'), t('reports.questions')]],
        body: subjectSummary.length
          ? subjectSummary.map(({ subject, questions }) => [
              subject.name,
              categoryLabelForSubject(subject),
              questions.toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US'),
            ])
          : [['—', '—', '0']],
        theme: 'grid',
        styles: {
          font: 'Roboto',
          fontSize: 8,
          cellPadding: 2.3,
          textColor: [45, 55, 65],
          lineColor: [225, 231, 226],
          lineWidth: 0.15,
          overflow: 'linebreak',
        },
        headStyles: {
          font: 'Roboto',
          fontStyle: 'bold',
          fillColor: [23, 36, 56],
          textColor: [255, 255, 255],
        },
        columnStyles: {
          0: { cellWidth: 64 },
          1: { cellWidth: 30 },
          2: { cellWidth: 30, halign: 'right' },
        },
      })

      const pdfWithTable = pdf as jsPDF & {
        lastAutoTable?: { finalY: number }
      }
      const summaryBottom = pdfWithTable.lastAutoTable?.finalY ?? 80
      const detailsHeadingY = summaryBottom + 10

      pdf.setFont('Roboto', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(23, 36, 56)
      pdf.text(t('reports.detailedRecords'), margin, detailsHeadingY)

      const detailHeaders = [
        t('reports.date'), t('reports.category'), t('reports.subject'), t('reports.topicSource'), t('reports.questions'), t('reports.correct'), t('reports.incorrect'), t('reports.blank'),
      ]

      if (includeNotes) detailHeaders.push(t('reports.notes'))

      const detailRows = records.length
        ? records.map((record) => {
            const topicAndSource = record.source
              ? `${record.topic}\n${t('reports.source')}: ${record.source}`
              : record.topic

            const row = [
              dateLabel(record.date, language),
              categoryLabelForSubject(subjectById.get(record.subjectId)),
              subjectById.get(record.subjectId)?.name ?? t('reports.unknownSubject'),
              topicAndSource,
              record.questionCount.toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US'),
              record.correctCount === undefined
                ? '—'
                : String(record.correctCount),
              record.incorrectCount === undefined
                ? '—'
                : String(record.incorrectCount),
              record.blankCount === undefined
                ? '—'
                : String(record.blankCount),
            ]

            if (includeNotes) row.push(record.notes || '—')

            return row
          })
        : [
            [
              '—',
              '—',
              '—',
              t('reports.noRecordsInRange'),
              '0',
              '—',
              '—',
              '—',
              ...(includeNotes ? ['—'] : []),
            ],
          ]

      const columnStyles: Record<number, { cellWidth: number; halign?: 'left' | 'right' }> = {
        0: { cellWidth: 24 },
        1: { cellWidth: 28 },
        2: { cellWidth: 32 },
        3: { cellWidth: includeNotes ? 52 : 112 },
        4: { cellWidth: 15, halign: 'right' },
        5: { cellWidth: 16, halign: 'right' },
        6: { cellWidth: 16, halign: 'right' },
        7: { cellWidth: 14, halign: 'right' },
      }

      if (includeNotes) columnStyles[8] = { cellWidth: 65 }

      autoTable(pdf, {
        startY: detailsHeadingY + 4,
        margin: { left: margin, right: margin, bottom: 17 },
        head: [detailHeaders],
        body: detailRows,
        theme: 'striped',
        showHead: 'everyPage',
        styles: {
          font: 'Roboto',
          fontSize: 7.5,
          cellPadding: 2,
          textColor: [45, 55, 65],
          overflow: 'linebreak',
          valign: 'middle',
        },
        headStyles: {
          font: 'Roboto',
          fontStyle: 'bold',
          fillColor: [23, 36, 56],
          textColor: [255, 255, 255],
        },
        alternateRowStyles: {
          fillColor: [247, 249, 247],
        },
        columnStyles,
      })

      const pageCount = pdf.getNumberOfPages()

      for (let page = 1; page <= pageCount; page += 1) {
        pdf.setPage(page)
        pdf.setFont('Roboto', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(125, 132, 140)
        pdf.text(
          `Çalışma Defteri · Rapor tarihi: ${generatedAt}`,
          margin,
          pageHeight - 7,
        )
        pdf.text(`${page} / ${pageCount}`, pageWidth - margin, pageHeight - 7, {
          align: 'right',
        })
      }

      pdf.save(`${language === 'tr' ? 'calisma-raporu' : 'study-report'}-${startDate}-${endDate}.pdf`)
      setSuccess(t('reports.pdfSuccess'))
    } catch (caught) {
      setError(errorMessage(caught, t('reports.genericError')))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-7">
      <section>
        <h2 className="text-base font-semibold text-slate-900">
          {t('reports.pageTitle')}
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {t('reports.pageDescription')}
        </p>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-[#d5e5d8] bg-[#eef5ef] px-4 py-3 text-sm text-[#315b3d]"
        >
          {success}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4ee] text-[#426b52]">
            <FileText size={19} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {t('reports.settingsTitle')}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {t('reports.settingsDescription')}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="report-type" className="text-xs font-medium text-slate-700">
              {t('reports.reportType')}
            </label>
            <select
              id="report-type"
              value={reportType}
              onChange={(event) =>
                selectReportType(event.target.value as ReportType)
              }
              className={`${inputClass} mt-1.5`}
            >
              <option value="daily">{t('reports.daily')}</option>
              <option value="weekly">{t('reports.weekly')}</option>
              <option value="fortnightly">{t('reports.fortnightly')}</option>
              <option value="monthly">{t('reports.monthly')}</option>
              <option value="custom">{t('reports.custom')}</option>
            </select>
          </div>

          <div>
            <label htmlFor="report-start" className="text-xs font-medium text-slate-700">
              {t('reports.startDate')}
            </label>
            <input
              id="report-start"
              type="date"
              value={startDate}
              onChange={(event) => editStartDate(event.target.value)}
              className={`${inputClass} mt-1.5`}
              required
            />
          </div>

          <div>
            <label htmlFor="report-end" className="text-xs font-medium text-slate-700">
              {t('reports.endDate')}
            </label>
            <input
              id="report-end"
              type="date"
              value={endDate}
              onChange={(event) => editEndDate(event.target.value)}
              className={`${inputClass} mt-1.5`}
              required
            />
          </div>
        </div>

        <label className="mt-5 flex items-start gap-2.5 text-xs leading-5 text-slate-600">
          <input
            type="checkbox"
            checked={includeNotes}
            onChange={(event) => setIncludeNotes(event.target.checked)}
            className="mt-0.5 accent-[#315b3d]"
          />
          {t('reports.includeNotes')}
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => void downloadPdf()}
            disabled={loading || generating || !validRange}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#244b38] px-4 py-3 text-xs font-semibold text-white transition-colors hover:bg-[#193b2a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={16} />
            {generating ? t('reports.generating') : t('reports.downloadPdf')}
          </button>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Printer size={15} />
              {t('reports.backToCalendar')}
            </button>
          )}

          <span className="text-xs text-slate-500">
            {loading ? t('reports.loadingRecords') : `${records.length} ${t('reports.recordsFound')}`}
          </span>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-slate-400">
            {t('reports.preview')}
          </p>
          <h3 className="mt-1.5 text-base font-semibold text-slate-900">
            {reportTitle}
          </h3>
          <p className="mt-1 text-xs text-slate-500">{rangeDescription}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-6">
          {[
            { label: t('reports.totalQuestions'), value: totalQuestions },
            { label: t('reports.subjectCount'), value: subjectSummary.length },
            { label: t('reports.recordCount'), value: records.length },
            { label: t('reports.studyDays'), value: activeStudyDayCount },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-slate-200/80 bg-[#fafbf9] p-4"
            >
              <p className="text-[11px] text-slate-500">{metric.label}</p>
              <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">
                {loading ? '…' : metric.value.toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US')}
              </p>
            </div>
          ))}
        </div>

        <div className="px-4 pb-6 sm:px-6">
          <h4 className="text-sm font-semibold text-slate-900">
            {t('reports.subjectTotals')}
          </h4>

          {subjectSummary.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              {loading
                ? t('reports.loadingRecords')
                : t('reports.noRecordsInRange')}
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[360px] text-left text-xs">
                <thead className="bg-[#172438] text-white">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t('reports.subject')}</th>
                    <th className="px-4 py-3 font-medium">{t('reports.category')}</th>
                    <th className="px-4 py-3 text-right font-medium">{t('reports.questions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjectSummary.map(({ subject, questions }) => (
                    <tr key={subject.id}>
                      <td className="px-4 py-3 text-slate-800">{subject.name}</td>
                      <td className="px-4 py-3 text-slate-600">{categoryLabelForSubject(subject)}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-800">
                        {questions.toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                {t('reports.detailedRecords')}
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                {t('reports.detailDescription')}
                {includeNotes ? ', notlar' : ''}.
              </p>
            </div>
            <span className="text-[11px] text-slate-400">
              {records.length} {t('reports.rows')}
            </span>
          </div>

          {records.length === 0 && !loading ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              {t('reports.noDetailedRecords')}
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="bg-[#172438] text-white">
                  <tr>
                    <th className="px-3 py-3 font-medium">{t('reports.date')}</th>
                    <th className="px-3 py-3 font-medium">{t('reports.category')}</th>
                    <th className="px-3 py-3 font-medium">{t('reports.subject')}</th>
                    <th className="px-3 py-3 font-medium">{t('reports.topicSource')}</th>
                    <th className="px-3 py-3 text-right font-medium">{t('reports.questions')}</th>
                    <th className="px-3 py-3 text-right font-medium">{t('reports.correct')}</th>
                    <th className="px-3 py-3 text-right font-medium">{t('reports.incorrect')}</th>
                    <th className="px-3 py-3 text-right font-medium">{t('reports.blank')}</th>
                    {includeNotes && (
                      <th className="px-3 py-3 font-medium">Notlar</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                        {record.date}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{categoryLabelForSubject(subjectById.get(record.subjectId))}</td>
                      <td className="px-3 py-3 text-slate-700">
                        {subjectById.get(record.subjectId)?.name ?? t('reports.unknownSubject')}
                      </td>
                      <td className="max-w-[260px] whitespace-pre-wrap px-3 py-3 text-slate-700">
                        {record.topic}
                        {record.source && (
                          <span className="mt-1 block text-[10px] text-slate-400">
                            {record.source}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums text-slate-800">
                        {record.questionCount}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                        {record.correctCount ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                        {record.incorrectCount ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                        {record.blankCount ?? '—'}
                      </td>
                      {includeNotes && (
                        <td className="max-w-[220px] whitespace-pre-wrap px-3 py-3 text-slate-600">
                          {record.notes || '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-[10px] leading-5 text-slate-400">
            {t('reports.previewNotice1')}
            {t('reports.previewNotice2')}
          </p>
        </div>
      </section>
    </div>
  )
}
