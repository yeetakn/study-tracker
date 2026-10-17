import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import OverviewPage from './pages/OverviewPage'
import CalendarPage from './pages/CalendarPage'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Settings,
} from 'lucide-react'


type PageId = 'overview' | 'calendar' | 'reports' | 'settings'

type NavigationItem = {
  id: PageId
  label: string
  icon: LucideIcon
}

const navigation: NavigationItem[] = [
  { id: 'overview', label: 'Genel Bakış', icon: LayoutDashboard },
  { id: 'calendar', label: 'Takvim', icon: CalendarDays },
  { id: 'reports', label: 'Raporlar', icon: FileText },
  { id: 'settings', label: 'Ayarlar / Yedekleme', icon: Settings },
]

const pageDescriptions: Record<PageId, string> = {
  overview: 'Çalışmalarının genel görünümü.',
  calendar: 'Günlerini seç, çalışmalarını kaydet.',
  reports: 'Çalışma geçmişini düzenli raporlara dönüştür.',
  settings: 'Verilerini yönet ve yedeklerini güvenle sakla.',
}

function getTodayLabel() {
  const formatted = new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return formatted.charAt(0).toLocaleUpperCase('tr-TR') + formatted.slice(1)
}

function Sidebar({
  activePage,
  onNavigate,
}: {
  activePage: PageId
  onNavigate: (page: PageId) => void
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col bg-[#172438] text-white lg:flex">
      <div className="flex items-center gap-3 px-6 py-7">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-[#d8e9dc] text-[#264b3a]">
          <BookOpen size={23} strokeWidth={1.9} />
        </div>

        <div>
          <p className="text-[17px] font-semibold tracking-tight">
            Çalışma Defteri
          </p>
          <p className="mt-0.5 text-[10px] font-semibold tracking-[0.2em] text-slate-400">
            DERS TAKİP ALANI
          </p>
        </div>
      </div>

      <div className="mx-5 h-px bg-white/10" />

      <nav className="flex-1 space-y-1 px-3 py-7" aria-label="Ana menü">
        <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.18em] text-slate-500">
          ÇALIŞMA ALANI
        </p>

        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = activePage === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-[#dcebe0] text-[#244b38]'
                  : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
              }`}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{item.label}</span>

              {isActive && (
                <ChevronRight className="ml-auto" size={16} />
              )}
            </button>
          )
        })}
      </nav>

      <div className="mx-5 h-px bg-white/10" />

      <div className="px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[#c9dfce]">
            <BookOpen size={16} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-200">
              Sed vitae discimus.
            </p>
            <p className="mt-1 text-[11px] leading-5 text-slate-400">
              Hayat için öğreniyoruz.
            </p>
          </div>
        </div>

        <p className="mt-7 text-[10px] text-slate-500">
          Çalışma Defteri · v1.0.0
        </p>
      </div>
    </aside>
  )
}

function MobileNavigation({
  activePage,
  onNavigate,
}: {
  activePage: PageId
  onNavigate: (page: PageId) => void
}) {
  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-[#172438] text-[#d8e9dc]">
          <BookOpen size={19} />
        </div>
        <span className="font-semibold tracking-tight text-slate-900">
          Çalışma Defteri
        </span>
      </div>

      <nav
        className="flex gap-1 overflow-x-auto"
        aria-label="Mobil ana menü"
      >
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = activePage === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                isActive
                  ? 'bg-[#e1eee4] text-[#244b38]'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon size={15} />
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function EmptyState({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string
  description: string
  icon: LucideIcon
  action?: {
    label: string
    onClick: () => void
  }
}) {
  return (
    <div className="flex min-h-[230px] flex-col items-center justify-center px-5 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500">
        <Icon size={22} strokeWidth={1.6} />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-800">
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-xs leading-6 text-slate-500">
        {description}
      </p>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          {action.label}
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  )
}

function Overview({
  onNavigate,
}: {
  onNavigate: (page: PageId) => void
}) {
  return (
    <OverviewPage
      onNavigate={() => onNavigate('calendar')}
    />
  )
}

function PlaceholderPage({
  page,
  onNavigate,
}: {
  page: Exclude<PageId, 'overview'>
  onNavigate: (page: PageId) => void
}) {
  if (page === 'calendar') {
    return <CalendarPage />
  }
  if (page === 'settings') {
  return <SettingsPage />
  }
  if (page === 'reports') {
  return (
    <ReportsPage
      onNavigate={() => onNavigate('calendar')}
    />
  )
}

  const item = navigation.find((entry) => entry.id === page)!
  const Icon = item.icon

  const details: Record<Exclude<PageId, 'overview'>, string> = {
    calendar:
      'Aylık takvim, tarih seçimi ve seçilen güne ait çalışma kayıtlarını bir sonraki aşamada burada oluşturacağız.',
    reports:
      'Günlük, haftalık, aylık ve özel tarih aralıklı raporları burada hazırlayacağız.',
    settings:
      'Ders yönetimi, JSON yedekleme ve yedekten geri yükleme seçeneklerini burada toplayacağız.',
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-8">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
        <div className="flex size-11 items-center justify-center rounded-xl bg-[#edf4ee] text-[#426b52]">
          <Icon size={20} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {item.label}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {pageDescriptions[page]}
          </p>
        </div>
      </div>

      <EmptyState
        icon={Icon}
        title="Bu alanı sıradaki aşamada oluşturacağız"
        description={details[page]}
        action={{
          label: 'Genel bakışa dön',
          onClick: () => onNavigate('overview'),
        }}
      />
    </section>
  )
}

function App() {
  const [activePage, setActivePage] = useState<PageId>('overview')
  const activeItem = navigation.find((item) => item.id === activePage)!

  return (
    <div className="min-h-screen bg-[#f6f7f5] text-slate-900">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <MobileNavigation
        activePage={activePage}
        onNavigate={setActivePage}
      />

      <main className="min-w-0 lg:pl-[264px]">
        <header className="border-b border-slate-200/80 bg-white/80 px-5 py-5 sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium text-slate-500">
                {getTodayLabel()}
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {activeItem.label}
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                {pageDescriptions[activePage]}
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
              <span className="size-2 rounded-full bg-[#77a585]" />
              <span className="text-[11px] font-medium text-slate-600">
                Kişisel çalışma alanı
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
          {activePage === 'overview' ? (
            <Overview onNavigate={setActivePage} />
          ) : (
            <PlaceholderPage
              page={activePage}
              onNavigate={setActivePage}
            />
          )}

          <footer className="mt-10 border-t border-slate-200/80 py-5">
            <p className="text-center text-[11px] text-slate-400">
              Çalışma Defteri · Vivere Est Cogitare.
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App