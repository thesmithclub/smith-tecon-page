import React, { useState, useEffect, useMemo } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Calendar } from './ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog'
import { CalendarIcon, Plus, Minus, Search, ArrowLeft, Check, Trash2, X } from 'lucide-react'

import { toast } from 'sonner@2.0.3'
import { projectId, publicAnonKey } from '../utils/supabase/info'

interface Booking {
  bookingNumber: string
  carModel: string
  name: string
  phone: string
  location: string
  visitDate: string
  visitTime: string
  message: string
  status: string
}

interface Item {
  id: string
  name: string
  package: string | string[]
  category: string
  imageUrl: string
  description: string
  price: number
  installationPrice?: number
}

type SelectionMode = 'all' | 'item_only' | 'installation_only'

interface SelectedItem {
  item: Item
  quantity: number
  mode: SelectionMode
}

interface ConsultingIntake {
  isFirstEV: string
  vehicleUse: string[]
  vehicleUseOther: string
  passengers: string[]
  passengersOther: string
  privacyPriority: string[]
  privacyPriorityOther: string
  interiorPreferences: string[]
  interiorPreferencesOther: string
  exteriorPreferences: string[]
  exteriorPreferencesOther: string
}

const OTHER_OPTION = '기타'

interface ConsultingData {
  bookingNumber: string
  carInDate: Date | undefined
  consultingNotes: string
  consultant: string
  intake: ConsultingIntake
  selectedItems: SelectedItem[]
  totalPrice: number
}

const EMPTY_INTAKE: ConsultingIntake = {
  isFirstEV: '',
  vehicleUse: [],
  vehicleUseOther: '',
  passengers: [],
  passengersOther: '',
  privacyPriority: [],
  privacyPriorityOther: '',
  interiorPreferences: [],
  interiorPreferencesOther: '',
  exteriorPreferences: [],
  exteriorPreferencesOther: ''
}

const INTAKE_OPTIONS = {
  vehicleUse: ['출퇴근', '가족용', '업무/출장', '여가/레저', '장거리 주행', OTHER_OPTION],
  passengers: ['아이 동승', '반려동물 동승', '고령자 동승', '성인 동승', OTHER_OPTION],
  privacyPriority: ['프라이버시 중시', '열 차단 중시', '자외선 차단', '균형있게', OTHER_OPTION],
  interiorPreferences: ['프리미엄', '실용성', '미니멀', '테크/디지털', '편의성', OTHER_OPTION],
  exteriorPreferences: ['차량 보호(PPF/코팅)', '스타일링', '휠/타이어', '루프/캐리어', '미관 유지', OTHER_OPTION]
} as const

const MODE_LABEL: Record<SelectionMode, string> = {
  all: '전체',
  item_only: '제품',
  installation_only: '공임비',
}

function unitPrice(si: SelectedItem): number {
  switch (si.mode ?? 'item_only') {
    case 'all': return si.item.price + (si.item.installationPrice ?? 0)
    case 'installation_only': return si.item.installationPrice ?? 0
    default: return si.item.price
  }
}

interface ConsultingPageProps {
  bookingNumber: string
  onBack: () => void
}

const ALL_TAB = '__all__'

export function ConsultingPage({ bookingNumber, onBack }: ConsultingPageProps) {
  const [booking, setBooking] = useState<Booking | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [packages, setPackages] = useState<Array<{id: string, name: string, description: string}>>([])
  const [consultingData, setConsultingData] = useState<ConsultingData>({
    bookingNumber,
    carInDate: undefined,
    consultingNotes: '',
    consultant: '',
    intake: { ...EMPTY_INTAKE },
    selectedItems: [],
    totalPrice: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<string>(ALL_TAB)
  const [detailItem, setDetailItem] = useState<Item | null>(null)

  useEffect(() => {
    fetchBookingAndItems()
  }, [])

  useEffect(() => {
    const total = consultingData.selectedItems.reduce(
      (sum, si) => sum + unitPrice(si) * si.quantity,
      0
    )
    setConsultingData(prev => ({ ...prev, totalPrice: total }))
  }, [consultingData.selectedItems])

  const fetchBookingAndItems = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const bookingResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/admin/bookings`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        signal: controller.signal
      })
      const bookingResult = await bookingResponse.json()
      if (bookingResult.success) {
        const foundBooking = bookingResult.bookings.find((b: Booking) => b.bookingNumber === bookingNumber)
        setBooking(foundBooking)
      }

      const packagesResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/packages`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        signal: controller.signal
      })
      const packagesResult = await packagesResponse.json()
      if (packagesResult.success) setPackages(packagesResult.packages || [])

      const itemsResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/items`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        signal: controller.signal
      })
      const itemsResult = await itemsResponse.json()
      if (itemsResult.success) setItems(itemsResult.items || [])

      const consultingResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/admin/consulting/${bookingNumber}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      const consultingResult = await consultingResponse.json()
      if (consultingResult.success && consultingResult.consulting) {
        const existing = consultingResult.consulting
        setConsultingData(prev => ({
          ...prev,
          carInDate: existing.carInDate ? new Date(existing.carInDate) : undefined,
          consultingNotes: existing.consultingNotes || '',
          consultant: existing.consultant || '',
          intake: { ...EMPTY_INTAKE, ...(existing.intake || {}) },
          selectedItems: (existing.selectedItems || []).map((si: any) => ({
            ...si,
            mode: (si.mode ?? 'item_only') as SelectionMode
          })),
          totalPrice: existing.totalPrice || 0
        }))
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        toast.error('요청 시간이 초과되었습니다. 다시 시도해주세요.')
      } else {
        console.error('Fetch error:', error)
        toast.error('데이터를 불러오는데 실패했습니다.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const addItem = (item: Item, mode: SelectionMode = 'all') => {
    setConsultingData(prev => {
      const existingIndex = prev.selectedItems.findIndex(
        si => si.item.id === item.id && si.mode === mode
      )
      if (existingIndex >= 0) {
        const newSelectedItems = [...prev.selectedItems]
        newSelectedItems[existingIndex] = {
          ...newSelectedItems[existingIndex],
          quantity: newSelectedItems[existingIndex].quantity + 1
        }
        return { ...prev, selectedItems: newSelectedItems }
      }
      return { ...prev, selectedItems: [...prev.selectedItems, { item, quantity: 1, mode }] }
    })
  }

  const removeItem = (itemId: string, mode: SelectionMode) => {
    setConsultingData(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.filter(
        si => !(si.item.id === itemId && si.mode === mode)
      )
    }))
  }

  const updateItemQuantity = (itemId: string, mode: SelectionMode, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId, mode)
      return
    }
    setConsultingData(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.map(si =>
        si.item.id === itemId && si.mode === mode ? { ...si, quantity } : si
      )
    }))
  }

  const isWeekend = (date: Date) => {
    const day = date.getDay()
    return day === 0 || day === 6
  }

  const selectedIds = useMemo(
    () => new Set(consultingData.selectedItems.map(si => si.item.id)),
    [consultingData.selectedItems]
  )

  const visibleItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return items.filter(item => {
      if (activeTab !== ALL_TAB) {
        const itemPackages = Array.isArray(item.package) ? item.package : [item.package]
        if (!itemPackages.includes(activeTab)) return false
      }
      if (!q) return true
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q)
      )
    })
  }, [items, activeTab, searchQuery])

  const selectAllVisibleInTab = () => {
    if (activeTab === ALL_TAB) return
    visibleItems.forEach(item => {
      if (!selectedIds.has(item.id)) addItem(item, 'all')
    })
    toast.success(`${activeTab} 패키지의 아이템이 선택되었습니다.`)
  }

  const handleSubmit = async () => {
    if (!consultingData.carInDate || !consultingData.consultant) {
      toast.error('차량입고일자와 담당컨설턴트를 선택해주세요.')
      return
    }
    setIsSaving(true)
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/admin/consulting`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...consultingData,
          carInDate: consultingData.carInDate.toISOString()
        })
      })
      const result = await response.json()
      if (result.success) {
        toast.success('컨설팅 정보가 저장되었습니다.')
        onBack()
      } else {
        toast.error('저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-neutral-500 tracking-wide">LOADING…</div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="mb-6 text-neutral-600">예약 정보를 찾을 수 없습니다.</p>
          <Button onClick={onBack} variant="outline">돌아가기</Button>
        </div>
      </div>
    )
  }

  const totalQty = consultingData.selectedItems.reduce((s, si) => s + si.quantity, 0)
  const packageTabs = [{ id: ALL_TAB, name: '전체' }, ...packages.map(p => ({ id: p.name, name: p.name }))]

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* 상단 스티키 헤더 */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-4 flex items-center gap-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>대시보드</span>
          </button>
          <div className="hidden md:flex items-baseline gap-3 flex-1 min-w-0">
            <span className="text-xs uppercase tracking-[0.18em] text-neutral-400">Consultation</span>
            <span className="text-sm text-neutral-300">·</span>
            <span className="text-sm font-medium text-neutral-800 truncate">{booking.name}</span>
            <span className="text-sm text-neutral-400">·</span>
            <span className="text-sm text-neutral-500 truncate">{booking.carModel}</span>
            <span className="text-sm text-neutral-400">·</span>
            <span className="text-sm text-neutral-500 tabular-nums">{booking.bookingNumber}</span>
          </div>
          <div className="flex items-center gap-6 ml-auto">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">선택 {totalQty}건</div>
              <div className="text-lg font-semibold tabular-nums">
                {consultingData.totalPrice.toLocaleString()}<span className="text-neutral-400 ml-0.5 text-sm">원</span>
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isSaving}
              className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-full px-6 h-10"
            >
              {isSaving ? '저장 중…' : '상담 완료 · 예약'}
            </Button>
          </div>
        </div>
      </header>

      {/* 히어로 */}
      <section className="border-b border-neutral-100">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10 lg:py-14">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-neutral-400 mb-3">In-person Consultation</div>
              <h1 className="text-3xl lg:text-5xl font-semibold tracking-tight leading-tight">
                {booking.name} <span className="text-neutral-400 font-light">고객님</span>
              </h1>
              <p className="text-neutral-500 mt-2 text-sm lg:text-base">
                {booking.carModel} · {new Date(booking.visitDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} {booking.visitTime}
              </p>
            </div>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3 text-sm">
              <InfoCell label="예약번호" value={booking.bookingNumber} mono />
              <InfoCell label="연락처" value={booking.phone} />
              <InfoCell label="방문 지점" value={booking.location} />
              <InfoCell label="상태" value={booking.status} />
            </dl>
          </div>
          {booking.message && (
            <p className="mt-6 text-sm text-neutral-600 bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3 max-w-2xl">
              “{booking.message}”
            </p>
          )}
        </div>
      </section>

      {/* 컨설팅 정보 입력 */}
      <section className="border-b border-neutral-100">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <FieldLabel required>차량 입고일자</FieldLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="mt-2 w-full h-12 px-4 flex items-center justify-between rounded-xl border border-neutral-200 bg-white text-sm hover:border-neutral-400 transition">
                    <span className={consultingData.carInDate ? 'text-neutral-900' : 'text-neutral-400'}>
                      {consultingData.carInDate
                        ? consultingData.carInDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
                        : '날짜를 선택하세요'}
                    </span>
                    <CalendarIcon className="h-4 w-4 text-neutral-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={consultingData.carInDate}
                    onSelect={(date) => setConsultingData(prev => ({ ...prev, carInDate: date }))}
                    disabled={(date) => date < new Date() || isWeekend(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <FieldLabel required>담당 컨설턴트</FieldLabel>
              <Select
                value={consultingData.consultant}
                onValueChange={(value) => setConsultingData(prev => ({ ...prev, consultant: value }))}
              >
                <SelectTrigger className="mt-2 !h-12 px-4 rounded-xl border-neutral-200 bg-white">
                  <SelectValue placeholder="컨설턴트를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="김기현">김기현</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* 상담 인테이크 - 고객 니즈 파악 */}
      <section className="border-b border-neutral-100 bg-neutral-50/40">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10 lg:py-12">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[0.2em] text-neutral-400">Intake</div>
            <h2 className="text-2xl font-semibold tracking-tight mt-1">고객 라이프스타일 &amp; 니즈</h2>
            <p className="text-sm text-neutral-500 mt-1.5">선택한 항목을 바탕으로 최적의 패키지를 제안해드립니다.</p>
          </div>

          <div className="mb-8 pb-8 border-b border-neutral-200/80">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">전기차 경험</div>
                <div className="text-xs text-neutral-400 mt-1">이 차량이 첫 전기차인가요?</div>
              </div>
              {consultingData.intake.isFirstEV && (
                <button
                  onClick={() => setConsultingData(prev => ({
                    ...prev,
                    intake: { ...prev.intake, isFirstEV: '' }
                  }))}
                  className="text-[10px] uppercase tracking-[0.18em] text-neutral-400 hover:text-neutral-900 transition"
                >
                  선택 해제
                </button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {['예, 첫 전기차', '아니오, 경험 있음'].map(opt => {
                const active = consultingData.intake.isFirstEV === opt
                return (
                  <button
                    key={opt}
                    onClick={() => setConsultingData(prev => ({
                      ...prev,
                      intake: { ...prev.intake, isFirstEV: active ? '' : opt }
                    }))}
                    className={`h-10 px-4 rounded-full border text-sm transition inline-flex items-center gap-1.5 ${
                      active
                        ? 'bg-neutral-900 border-neutral-900 text-white'
                        : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400'
                    }`}
                  >
                    {active && <Check className="h-3.5 w-3.5" />}
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            <IntakeGroup
              label="주요 용도"
              hint="차량을 어떤 목적으로 사용하시나요? (복수 선택)"
              options={INTAKE_OPTIONS.vehicleUse}
              values={consultingData.intake.vehicleUse}
              onToggle={(v) => setConsultingData(prev => {
                const next = toggleValue(prev.intake.vehicleUse, v)
                return {
                  ...prev,
                  intake: {
                    ...prev.intake,
                    vehicleUse: next,
                    vehicleUseOther: next.includes(OTHER_OPTION) ? prev.intake.vehicleUseOther : ''
                  }
                }
              })}
              otherValue={consultingData.intake.vehicleUseOther}
              onOtherChange={(v) => setConsultingData(prev => ({
                ...prev,
                intake: { ...prev.intake, vehicleUseOther: v }
              }))}
              otherPlaceholder="예: 배달, 픽업 등"
            />
            <IntakeGroup
              label="동승자"
              hint="자주 함께 탑승하는 구성원이 있나요? (복수 선택)"
              options={INTAKE_OPTIONS.passengers}
              values={consultingData.intake.passengers}
              onToggle={(v) => setConsultingData(prev => {
                const next = toggleValue(prev.intake.passengers, v)
                return {
                  ...prev,
                  intake: {
                    ...prev.intake,
                    passengers: next,
                    passengersOther: next.includes(OTHER_OPTION) ? prev.intake.passengersOther : ''
                  }
                }
              })}
              otherValue={consultingData.intake.passengersOther}
              onOtherChange={(v) => setConsultingData(prev => ({
                ...prev,
                intake: { ...prev.intake, passengersOther: v }
              }))}
              otherPlaceholder="예: 카시트 2개, 중형견 등"
            />
            <IntakeGroup
              label="프라이버시 / 썬팅"
              hint="프라이버시와 열 차단 중 무엇이 우선인가요?"
              options={INTAKE_OPTIONS.privacyPriority}
              values={consultingData.intake.privacyPriority}
              onToggle={(v) => setConsultingData(prev => {
                const next = toggleValue(prev.intake.privacyPriority, v)
                return {
                  ...prev,
                  intake: {
                    ...prev.intake,
                    privacyPriority: next,
                    privacyPriorityOther: next.includes(OTHER_OPTION) ? prev.intake.privacyPriorityOther : ''
                  }
                }
              })}
              otherValue={consultingData.intake.privacyPriorityOther}
              onOtherChange={(v) => setConsultingData(prev => ({
                ...prev,
                intake: { ...prev.intake, privacyPriorityOther: v }
              }))}
              otherPlaceholder="예: 특정 농도 선호, 전면 투과율 등"
            />
            <IntakeGroup
              label="실내 선호"
              hint="실내 악세서리에서 중요하게 여기시는 요소"
              options={INTAKE_OPTIONS.interiorPreferences}
              values={consultingData.intake.interiorPreferences}
              onToggle={(v) => setConsultingData(prev => {
                const next = toggleValue(prev.intake.interiorPreferences, v)
                return {
                  ...prev,
                  intake: {
                    ...prev.intake,
                    interiorPreferences: next,
                    interiorPreferencesOther: next.includes(OTHER_OPTION) ? prev.intake.interiorPreferencesOther : ''
                  }
                }
              })}
              otherValue={consultingData.intake.interiorPreferencesOther}
              onOtherChange={(v) => setConsultingData(prev => ({
                ...prev,
                intake: { ...prev.intake, interiorPreferencesOther: v }
              }))}
              otherPlaceholder="예: 트렁크 정리함, 수납 강화 등"
            />
            <IntakeGroup
              label="외부 선호"
              hint="외부 악세서리/보호 옵션 중 관심 있으신 항목"
              options={INTAKE_OPTIONS.exteriorPreferences}
              values={consultingData.intake.exteriorPreferences}
              onToggle={(v) => setConsultingData(prev => {
                const next = toggleValue(prev.intake.exteriorPreferences, v)
                return {
                  ...prev,
                  intake: {
                    ...prev.intake,
                    exteriorPreferences: next,
                    exteriorPreferencesOther: next.includes(OTHER_OPTION) ? prev.intake.exteriorPreferencesOther : ''
                  }
                }
              })}
              otherValue={consultingData.intake.exteriorPreferencesOther}
              onOtherChange={(v) => setConsultingData(prev => ({
                ...prev,
                intake: { ...prev.intake, exteriorPreferencesOther: v }
              }))}
              otherPlaceholder="예: 머드가드, 도어 프로텍터 등"
              className="md:col-span-2"
            />
          </div>

          <div className="mt-10">
            <FieldLabel>추가 메모</FieldLabel>
            <Textarea
              value={consultingData.consultingNotes}
              onChange={(e) => setConsultingData(prev => ({ ...prev, consultingNotes: e.target.value }))}
              placeholder="위 항목 외 특이사항, 구체적인 요구사항, 고객 코멘트 등"
              rows={3}
              className="mt-2 rounded-xl border-neutral-200 bg-white resize-none"
            />
          </div>
        </div>
      </section>

      {/* 카탈로그 + 선택 아이템 */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
          {/* 카탈로그 */}
          <div>
            <div className="mb-6">
              <div className="text-xs uppercase tracking-[0.2em] text-neutral-400">Catalog</div>
              <h2 className="text-2xl font-semibold tracking-tight mt-1">패키지 &amp; 옵션</h2>
            </div>

            {/* 패키지 탭 */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
              {packageTabs.map(tab => {
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 px-4 h-9 rounded-full text-sm transition border ${
                      active
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400 hover:text-neutral-900'
                    }`}
                  >
                    {tab.name}
                  </button>
                )
              })}
              {activeTab !== ALL_TAB && visibleItems.length > 0 && (
                <button
                  onClick={selectAllVisibleInTab}
                  className="ml-auto text-xs text-neutral-500 hover:text-neutral-900 transition whitespace-nowrap"
                >
                  이 패키지 모두 선택 →
                </button>
              )}
            </div>

            {/* 옵션 검색 */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="옵션 검색 (이름, 카테고리, 설명)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-10 h-11 w-full rounded-full border-neutral-200 bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition"
                  aria-label="검색 초기화"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* 아이템 그리드 */}
            {visibleItems.length === 0 ? (
              <div className="py-20 text-center text-neutral-400 text-sm">
                해당 조건에 맞는 옵션이 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {visibleItems.map(item => {
                  const selected = selectedIds.has(item.id)
                  const pkgs = Array.isArray(item.package) ? item.package : [item.package]
                  return (
                    <article
                      key={item.id}
                      onClick={() => setDetailItem(item)}
                      className={`group relative rounded-2xl overflow-hidden border transition bg-white cursor-pointer ${
                        selected ? 'border-neutral-900 shadow-sm' : 'border-neutral-200 hover:border-neutral-400 hover:shadow-sm'
                      }`}
                    >
                      <div className="relative aspect-[16/10] bg-neutral-100 overflow-hidden">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-300 text-xs tracking-widest">
                            NO IMAGE
                          </div>
                        )}
                        {selected && (
                          <div className="absolute top-3 right-3 h-7 w-7 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <div className="flex flex-wrap gap-1 mb-2">
                          {pkgs.filter(Boolean).slice(0, 3).map(p => (
                            <span key={p} className="text-[10px] uppercase tracking-[0.12em] text-neutral-500 bg-neutral-100 rounded-full px-2 py-0.5">
                              {p}
                            </span>
                          ))}
                        </div>
                        <h3 className="font-semibold text-base leading-snug">{item.name}</h3>
                        {item.description && (
                          <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{item.description}</p>
                        )}
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="text-lg font-semibold tabular-nums">
                                {item.price.toLocaleString()}<span className="text-neutral-400 ml-0.5 text-sm">원</span>
                              </div>
                              {item.installationPrice ? (
                                <div className="text-xs text-neutral-500 tabular-nums mt-0.5">
                                  공임비 {item.installationPrice.toLocaleString()}원
                                </div>
                              ) : null}
                            </div>
                            {selected && (
                              <div className="h-6 w-6 rounded-full bg-neutral-900 text-white flex items-center justify-center">
                                <Check className="h-3.5 w-3.5" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              onClick={() => addItem(item, 'all')}
                              className="rounded-full h-8 px-3 text-xs bg-neutral-900 text-white hover:bg-neutral-800"
                              variant="ghost"
                            >
                              전체담기
                            </Button>
                            {item.installationPrice ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => addItem(item, 'item_only')}
                                  className="rounded-full h-8 px-3 text-xs bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
                                  variant="ghost"
                                >
                                  제품만 담기
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => addItem(item, 'installation_only')}
                                  className="rounded-full h-8 px-3 text-xs bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
                                  variant="ghost"
                                >
                                  공임비 담기
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>

          {/* 선택된 아이템 (스티키) */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60">
              <div className="px-6 pt-6 pb-4 border-b border-neutral-200">
                <div className="text-xs uppercase tracking-[0.2em] text-neutral-400">Selection</div>
                <div className="flex items-baseline justify-between mt-1">
                  <h2 className="text-xl font-semibold tracking-tight">선택한 옵션</h2>
                  <span className="text-sm text-neutral-500 tabular-nums">{totalQty}건</span>
                </div>
              </div>

              <div className="max-h-[520px] overflow-y-auto">
                {consultingData.selectedItems.length === 0 ? (
                  <div className="px-6 py-16 text-center text-sm text-neutral-400">
                    아직 선택한 옵션이 없습니다.
                    <div className="text-xs mt-1 text-neutral-300">좌측에서 옵션을 담아주세요.</div>
                  </div>
                ) : (
                  <ul className="divide-y divide-neutral-200">
                    {consultingData.selectedItems.map((si, idx) => (
                      <li key={`${si.item.id}_${si.mode}_${idx}`} className="px-6 py-4">
                        <div className="flex gap-3">
                          <div className="w-14 h-14 rounded-lg bg-white border border-neutral-200 overflow-hidden shrink-0">
                            {si.item.imageUrl ? (
                              <img src={si.item.imageUrl} alt={si.item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-neutral-100" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="text-sm font-medium leading-snug truncate">{si.item.name}</h4>
                                <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500 mt-0.5">
                                  {MODE_LABEL[si.mode ?? 'item_only']}
                                </span>
                              </div>
                              <button
                                onClick={() => removeItem(si.item.id, si.mode)}
                                className="text-neutral-400 hover:text-neutral-900 transition shrink-0"
                                aria-label="삭제"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="text-xs text-neutral-500 mt-1 tabular-nums">
                              단가 {unitPrice(si).toLocaleString()}원
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center border border-neutral-200 rounded-full bg-white">
                                <button
                                  onClick={() => updateItemQuantity(si.item.id, si.mode, si.quantity - 1)}
                                  className="h-7 w-7 flex items-center justify-center text-neutral-600 hover:text-neutral-900"
                                  aria-label="수량 감소"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="w-7 text-center text-sm tabular-nums">{si.quantity}</span>
                                <button
                                  onClick={() => updateItemQuantity(si.item.id, si.mode, si.quantity + 1)}
                                  className="h-7 w-7 flex items-center justify-center text-neutral-600 hover:text-neutral-900"
                                  aria-label="수량 증가"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="text-sm font-semibold tabular-nums">
                                {(unitPrice(si) * si.quantity).toLocaleString()}원
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="px-6 py-5 border-t border-neutral-200 bg-white rounded-b-2xl">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs uppercase tracking-[0.2em] text-neutral-400">Total</span>
                  <span className="text-2xl font-semibold tabular-nums">
                    {consultingData.totalPrice.toLocaleString()}<span className="text-neutral-400 ml-0.5 text-base">원</span>
                  </span>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="mt-4 w-full h-12 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-[15px]"
                >
                  {isSaving ? '저장 중…' : '상담 완료 · 예약 진행'}
                </Button>
                <p className="text-[11px] text-neutral-400 text-center mt-2">
                  저장 시 예약 상태가 <strong className="text-neutral-600">상담완료</strong>로 변경됩니다.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <ItemDetailDialog
        item={detailItem}
        selectedItems={detailItem
          ? consultingData.selectedItems.filter(si => si.item.id === detailItem.id)
          : []
        }
        onClose={() => setDetailItem(null)}
        onAdd={(item, mode) => addItem(item, mode)}
        onUpdateQuantity={(itemId, mode, qty) => updateItemQuantity(itemId, mode, qty)}
        onRemove={(itemId, mode) => removeItem(itemId, mode)}
      />
    </div>
  )
}

function ItemDetailDialog({
  item,
  selectedItems,
  onClose,
  onAdd,
  onUpdateQuantity,
  onRemove
}: {
  item: Item | null
  selectedItems: SelectedItem[]
  onClose: () => void
  onAdd: (item: Item, mode: SelectionMode) => void
  onUpdateQuantity: (itemId: string, mode: SelectionMode, quantity: number) => void
  onRemove: (itemId: string, mode: SelectionMode) => void
}) {
  const open = !!item
  const pkgs = item ? (Array.isArray(item.package) ? item.package : [item.package]) : []

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent
        className="sm:max-w-3xl p-0 gap-0 overflow-hidden rounded-2xl border-neutral-200 bg-white [&>button[type='button']]:hidden"
      >
        <DialogTitle className="sr-only">{item?.name ?? '옵션 상세'}</DialogTitle>
        <DialogDescription className="sr-only">옵션 상세 정보 및 수량 조절</DialogDescription>

        {item && (
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* 이미지 */}
            <div className="relative aspect-[4/3] md:aspect-auto md:h-full bg-neutral-100">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-300 tracking-widest text-xs">
                  NO IMAGE
                </div>
              )}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/90 backdrop-blur border border-neutral-200 flex items-center justify-center text-neutral-700 hover:text-neutral-900 hover:bg-white transition md:hidden"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 상세 정보 */}
            <div className="p-7 lg:p-8 flex flex-col overflow-y-auto max-h-[90vh]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap gap-1.5">
                  {pkgs.filter(Boolean).map(p => (
                    <span
                      key={p}
                      className="text-[10px] uppercase tracking-[0.12em] text-neutral-600 bg-neutral-100 rounded-full px-2.5 py-1"
                    >
                      {p}
                    </span>
                  ))}
                </div>
                <button
                  onClick={onClose}
                  className="hidden md:flex h-8 w-8 rounded-full items-center justify-center text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition"
                  aria-label="닫기"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <h2 className="mt-4 text-2xl font-semibold tracking-tight leading-snug">{item.name}</h2>

              {item.category && (
                <div className="mt-1 text-xs uppercase tracking-[0.15em] text-neutral-400">
                  {item.category}
                </div>
              )}

              <div className="mt-5">
                <div className="text-3xl font-semibold tabular-nums">
                  {item.price.toLocaleString()}<span className="text-neutral-400 ml-1 text-base">원</span>
                </div>
                {item.installationPrice ? (
                  <div className="text-sm text-neutral-500 tabular-nums mt-1">
                    공임비 {item.installationPrice.toLocaleString()}원
                  </div>
                ) : null}
              </div>

              <div className="mt-6 border-t border-neutral-100 pt-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 mb-2">상세 설명</div>
                <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                  {item.description || '등록된 상세 설명이 없습니다.'}
                </p>
              </div>

              {/* 현재 선택된 항목 */}
              {selectedItems.length > 0 && (
                <div className="mt-5 border-t border-neutral-100 pt-5 space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 mb-3">선택 중</div>
                  {selectedItems.map((si) => (
                    <div key={si.mode} className="flex items-center justify-between rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3">
                      <div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-200 text-neutral-600 mr-2">
                          {MODE_LABEL[si.mode]}
                        </span>
                        <span className="text-sm tabular-nums font-medium">
                          {unitPrice(si).toLocaleString()}원 × {si.quantity}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-neutral-200 rounded-full bg-white">
                          <button
                            onClick={() => onUpdateQuantity(item.id, si.mode, si.quantity - 1)}
                            className="h-7 w-7 flex items-center justify-center text-neutral-600 hover:text-neutral-900"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm tabular-nums">{si.quantity}</span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, si.mode, si.quantity + 1)}
                            className="h-7 w-7 flex items-center justify-center text-neutral-600 hover:text-neutral-900"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => onRemove(item.id, si.mode)}
                          className="text-neutral-400 hover:text-neutral-900 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 담기 버튼 */}
              <div className="mt-auto pt-6 flex flex-wrap gap-2">
                <Button
                  onClick={() => onAdd(item, 'all')}
                  className="flex-1 h-11 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full"
                >
                  전체담기
                </Button>
                {item.installationPrice ? (
                  <>
                    <Button
                      onClick={() => onAdd(item, 'item_only')}
                      className="flex-1 h-11 bg-neutral-100 text-neutral-900 hover:bg-neutral-200 rounded-full"
                      variant="ghost"
                    >
                      제품만 담기
                    </Button>
                    <Button
                      onClick={() => onAdd(item, 'installation_only')}
                      className="flex-1 h-11 bg-neutral-100 text-neutral-900 hover:bg-neutral-200 rounded-full"
                      variant="ghost"
                    >
                      공임비 담기
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function InfoCell({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">{label}</dt>
      <dd className={`mt-1 text-sm text-neutral-800 ${mono ? 'tabular-nums' : ''}`}>{value}</dd>
    </div>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 flex items-center gap-1">
      {children}
      {required && <span className="text-neutral-900">*</span>}
    </label>
  )
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value]
}

interface IntakeGroupProps {
  label: string
  hint?: string
  options: readonly string[]
  values: string[]
  onToggle: (value: string) => void
  otherValue?: string
  onOtherChange?: (value: string) => void
  otherPlaceholder?: string
  className?: string
}

function IntakeGroup({
  label,
  hint,
  options,
  values,
  onToggle,
  otherValue,
  onOtherChange,
  otherPlaceholder = '직접 입력',
  className = ''
}: IntakeGroupProps) {
  const otherActive = values.includes(OTHER_OPTION)
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">{label}</div>
          {hint && <div className="text-xs text-neutral-400 mt-1">{hint}</div>}
        </div>
        {values.length > 0 && (
          <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-400 tabular-nums">
            {values.length}개 선택
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map(opt => {
          const active = values.includes(opt)
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              className={`h-10 px-4 rounded-full border text-sm transition inline-flex items-center gap-1.5 ${
                active
                  ? 'bg-neutral-900 border-neutral-900 text-white'
                  : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400'
              }`}
            >
              {active && <Check className="h-3.5 w-3.5" />}
              {opt}
            </button>
          )
        })}
      </div>
      {otherActive && onOtherChange && (
        <div className="mt-3">
          <Input
            value={otherValue ?? ''}
            onChange={(e) => onOtherChange(e.target.value)}
            placeholder={otherPlaceholder}
            className="h-10 rounded-xl border-neutral-200 bg-white"
          />
        </div>
      )}
    </div>
  )
}
