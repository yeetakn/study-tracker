
import { useEffect, useState } from 'react'
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns'
import { tr } from 'date-fns/locale'
import { Download, FileText, Printer } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  getStudyRecordsForDateRange,
  getSubjects,
} from '../db/database'
import type { Subject, StudyRecord } from '../types/study'

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

function dateLabel(value: string) {
  return format(dateFromKey(value), 'd MMMM yyyy', { locale: tr })
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'İşlem tamamlanamadı. Lütfen tekrar dene.'
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

function getReportTitle(type: ReportType) {
  const titles: Record<ReportType, string> = {
    daily: 'Günlük Çalışma Raporu',
    weekly: 'Haftalık Çalışma Raporu',
    fortnightly: 'İki Haftalık Çalışma Raporu',
    monthly: 'Aylık Çalışma Raporu',
    custom: 'Çalışma Raporu',
  }

  return titles[type]
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
  const today = new Date()
  const initialRange = getPresetRange('monthly', today)

  const [reportType, setReportType] = useState<ReportType>('monthly')
  const [startDate, setStartDate] = useState(dateKey(initialRange.start))
  const [endDate, setEndDate] = useState(dateKey(initialRange.end))
  const [includeNotes, setIncludeNotes] = useState(false)

  const [records, setRecords] = useState<StudyRecord[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
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
        setError('Başlangıç tarihi bitiş tarihinden sonra olamaz.')
        return
      }

      try {
        const [loadedRecords, loadedSubjects] = await Promise.all([
          getStudyRecordsForDateRange(startDate, endDate),
          getSubjects(),
        ])

        if (cancelled) return

        loadedRecords.sort(
          (a, b) =>
            a.date.localeCompare(b.date) ||
            a.createdAt.localeCompare(b.createdAt),
        )

        setRecords(loadedRecords)
        setSubjects(loadedSubjects)
      } catch (caught) {
        if (!cancelled) setError(errorMessage(caught))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadReportData()

    return () => {
      cancelled = true
    }
  }, [startDate, endDate, validRange])

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

  const totalQuestions = records.reduce(
    (sum, record) => sum + record.questionCount,
    0,
  )

  const tytQuestions = records
    .filter((record) => record.examType === 'TYT')
    .reduce((sum, record) => sum + record.questionCount, 0)

  const aytQuestions = records
    .filter((record) => record.examType === 'AYT')
    .reduce((sum, record) => sum + record.questionCount, 0)

  const subjectSummary = subjects
    .map((subject) => ({
      subject,
      questions: records
        .filter((record) => record.subjectId === subject.id)
        .reduce((sum, record) => sum + record.questionCount, 0),
    }))
    .filter((item) => item.questions > 0)
    .sort((a, b) => b.questions - a.questions)

  const reportTitle = getReportTitle(reportType)
  const rangeDescription =
    validRange
      ? `${dateLabel(startDate)} – ${dateLabel(endDate)}`
      : 'Geçersiz tarih aralığı'

  async function downloadPdf() {
    if (!validRange) {
      setError('Geçerli bir başlangıç ve bitiş tarihi seç.')
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
        locale: tr,
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
      pdf.text(`Tarih aralığı: ${rangeDescription}`, margin, 24)
      pdf.text(`Rapor tarihi: ${generatedAt}`, pageWidth - margin, 24, {
        align: 'right',
      })

      const metrics = [
        { label: 'Toplam soru', value: totalQuestions },
        { label: 'TYT sorusu', value: tytQuestions },
        { label: 'AYT sorusu', value: aytQuestions },
        { label: 'Çalışma kaydı', value: records.length },
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
          metric.value.toLocaleString('tr-TR'),
          x + 4,
          cardY + 16,
        )
      })

      pdf.setFont('Roboto', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(23, 36, 56)
      pdf.text('Ders bazında soru özeti', margin, 59)

      autoTable(pdf, {
        startY: 63,
        margin: { left: margin, right: margin, bottom: 17 },
        tableWidth: 132,
        head: [['Ders', 'Sınav', 'Soru']],
        body: subjectSummary.length
          ? subjectSummary.map(({ subject, questions }) => [
              subject.name,
              subject.examType,
              questions.toLocaleString('tr-TR'),
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
      pdf.text('Ayrıntılı çalışma kayıtları', margin, detailsHeadingY)

      const detailHeaders = [
        'Tarih',
        'Sınav',
        'Ders',
        'Konu / kaynak',
        'Soru',
        'Doğru',
        'Yanlış',
        'Boş',
      ]

      if (includeNotes) detailHeaders.push('Notlar')

      const detailRows = records.length
        ? records.map((record) => {
            const topicAndSource = record.source
              ? `${record.topic}\nKaynak: ${record.source}`
              : record.topic

            const row = [
              record.date,
              record.examType,
              subjectById.get(record.subjectId)?.name ?? 'Bilinmeyen ders',
              topicAndSource,
              record.questionCount.toLocaleString('tr-TR'),
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
              'Seçilen tarih aralığında kayıt bulunmuyor.',
              '0',
              '—',
              '—',
              '—',
              ...(includeNotes ? ['—'] : []),
            ],
          ]

      const columnStyles: Record<number, { cellWidth: number; halign?: 'left' | 'right' }> = {
        0: { cellWidth: 24 },
        1: { cellWidth: 15 },
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

      pdf.save(`calisma-raporu-${startDate}-${endDate}.pdf`)
      setSuccess('PDF raporu oluşturuldu ve indirme başlatıldı.')
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-7">
      <section>
        <h2 className="text-base font-semibold text-slate-900">
          PDF raporları
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Çalışma geçmişini seçtiğin tarih aralığı için önizle ve PDF olarak kaydet.
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
              Rapor ayarları
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Hafta pazartesi başlar. Özel aralıkta başlangıç ve bitiş tarihlerini kendin belirleyebilirsin.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="report-type" className="text-xs font-medium text-slate-700">
              Rapor türü
            </label>
            <select
              id="report-type"
              value={reportType}
              onChange={(event) =>
                selectReportType(event.target.value as ReportType)
              }
              className={`${inputClass} mt-1.5`}
            >
              <option value="daily">Günlük</option>
              <option value="weekly">Haftalık</option>
              <option value="fortnightly">İki haftalık</option>
              <option value="monthly">Aylık</option>
              <option value="custom">Özel tarih aralığı</option>
            </select>
          </div>

          <div>
            <label htmlFor="report-start" className="text-xs font-medium text-slate-700">
              Başlangıç tarihi
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
              Bitiş tarihi
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
          PDF ayrıntılı tablosuna çalışma notlarını ekle.
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => void downloadPdf()}
            disabled={loading || generating || !validRange}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#244b38] px-4 py-3 text-xs font-semibold text-white transition-colors hover:bg-[#193b2a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={16} />
            {generating ? 'PDF hazırlanıyor…' : 'PDF oluştur ve indir'}
          </button>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Printer size={15} />
              Takvime dön
            </button>
          )}

          <span className="text-xs text-slate-500">
            {loading ? 'Kayıtlar yükleniyor…' : `${records.length} kayıt bulundu`}
          </span>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-slate-400">
            PDF ÖNİZLEMESİ
          </p>
          <h3 className="mt-1.5 text-base font-semibold text-slate-900">
            {reportTitle}
          </h3>
          <p className="mt-1 text-xs text-slate-500">{rangeDescription}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-6">
          {[
            { label: 'Toplam soru', value: totalQuestions },
            { label: 'TYT soruları', value: tytQuestions },
            { label: 'AYT soruları', value: aytQuestions },
            { label: 'Kayıt sayısı', value: records.length },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-slate-200/80 bg-[#fafbf9] p-4"
            >
              <p className="text-[11px] text-slate-500">{metric.label}</p>
              <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">
                {loading ? '…' : metric.value.toLocaleString('tr-TR')}
              </p>
            </div>
          ))}
        </div>

        <div className="px-4 pb-6 sm:px-6">
          <h4 className="text-sm font-semibold text-slate-900">
            Ders toplamları
          </h4>

          {subjectSummary.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              {loading
                ? 'Kayıtlar yükleniyor…'
                : 'Bu tarih aralığında çalışma kaydı bulunmuyor.'}
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[360px] text-left text-xs">
                <thead className="bg-[#172438] text-white">
                  <tr>
                    <th className="px-4 py-3 font-medium">Ders</th>
                    <th className="px-4 py-3 font-medium">Sınav</th>
                    <th className="px-4 py-3 text-right font-medium">Soru</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjectSummary.map(({ subject, questions }) => (
                    <tr key={subject.id}>
                      <td className="px-4 py-3 text-slate-800">{subject.name}</td>
                      <td className="px-4 py-3 text-slate-600">{subject.examType}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-800">
                        {questions.toLocaleString('tr-TR')}
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
                Ayrıntılı çalışma kayıtları
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Tarih, sınav türü, ders, konu ve soru dağılımı
                {includeNotes ? ', notlar' : ''}.
              </p>
            </div>
            <span className="text-[11px] text-slate-400">
              {records.length} satır
            </span>
          </div>

          {records.length === 0 && !loading ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              Bu aralıkta ayrıntılı olarak gösterilecek kayıt yok.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="bg-[#172438] text-white">
                  <tr>
                    <th className="px-3 py-3 font-medium">Tarih</th>
                    <th className="px-3 py-3 font-medium">Sınav</th>
                    <th className="px-3 py-3 font-medium">Ders</th>
                    <th className="px-3 py-3 font-medium">Konu / kaynak</th>
                    <th className="px-3 py-3 text-right font-medium">Soru</th>
                    <th className="px-3 py-3 text-right font-medium">Doğru</th>
                    <th className="px-3 py-3 text-right font-medium">Yanlış</th>
                    <th className="px-3 py-3 text-right font-medium">Boş</th>
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
                      <td className="px-3 py-3 text-slate-600">{record.examType}</td>
                      <td className="px-3 py-3 text-slate-700">
                        {subjectById.get(record.subjectId)?.name ?? 'Bilinmeyen ders'}
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
            Bu önizleme gerçek yerel çalışma kayıtlarından oluşturuluyor.
            PDF sayfa düzeni ve sayfa numaraları indirme sırasında uygulanır.
          </p>
        </div>
      </section>
    </div>
  )
}
