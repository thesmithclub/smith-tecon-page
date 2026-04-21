import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Calendar } from './ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { CalendarIcon, Plus, Minus, ChevronDown, ChevronRight, Search } from 'lucide-react'

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
}

interface SelectedItem {
  item: Item
  quantity: number
}

interface ConsultingData {
  bookingNumber: string
  carInDate: Date | undefined
  consultingNotes: string
  consultant: string
  selectedItems: SelectedItem[]
  totalPrice: number
}

interface ConsultingPageProps {
  bookingNumber: string
  onBack: () => void
}

export function ConsultingPage({ bookingNumber, onBack }: ConsultingPageProps) {
  const [booking, setBooking] = useState<Booking | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [packages, setPackages] = useState<Array<{id: string, name: string, description: string}>>([])
  const [consultingData, setConsultingData] = useState<ConsultingData>({
    bookingNumber,
    carInDate: undefined,
    consultingNotes: '',
    consultant: '',
    selectedItems: [],
    totalPrice: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set())
  const [showAllItems, setShowAllItems] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchBookingAndItems()
  }, [])

  useEffect(() => {
    calculateTotalPrice()
  }, [consultingData.selectedItems])

  const fetchBookingAndItems = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15초 타임아웃

      // 예약 정보 조회
      const bookingResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/admin/bookings`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        },
        signal: controller.signal
      })

      const bookingResult = await bookingResponse.json()
      if (bookingResult.success) {
        const foundBooking = bookingResult.bookings.find((b: Booking) => b.bookingNumber === bookingNumber)
        setBooking(foundBooking)
      }

      // 패키지 목록 조회
      const packagesResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/packages`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        },
        signal: controller.signal
      })

      const packagesResult = await packagesResponse.json()
      if (packagesResult.success) {
        setPackages(packagesResult.packages || [])
      }

      // 아이템 목록 조회
      const itemsResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/items`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        },
        signal: controller.signal
      })

      const itemsResult = await itemsResponse.json()
      if (itemsResult.success) {
        setItems(itemsResult.items || [])
      }

      // 기존 컨설팅 정보 조회
      const consultingResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/admin/consulting/${bookingNumber}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        },
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
          selectedItems: existing.selectedItems || [],
          totalPrice: existing.totalPrice || 0
        }))
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        toast.error('요청 시간이 초과되었습니다. 다시 시도해주세요.')
      } else {
        console.error('Fetch error:', error)
        toast.error('데이터를 불러오는데 실패했습니다.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const calculateTotalPrice = () => {
    const total = consultingData.selectedItems.reduce((sum, selectedItem) => {
      return sum + (selectedItem.item.price * selectedItem.quantity)
    }, 0)
    
    setConsultingData(prev => ({ ...prev, totalPrice: total }))
  }

  const addItem = (item: Item) => {
    setConsultingData(prev => {
      const existingIndex = prev.selectedItems.findIndex(si => si.item.id === item.id)
      
      if (existingIndex >= 0) {
        // 이미 있는 아이템이면 수량 증가
        const newSelectedItems = [...prev.selectedItems]
        newSelectedItems[existingIndex].quantity += 1
        return { ...prev, selectedItems: newSelectedItems }
      } else {
        // 새로운 아이템 추가
        return {
          ...prev,
          selectedItems: [...prev.selectedItems, { item, quantity: 1 }]
        }
      }
    })
  }

  const removeItem = (itemId: string) => {
    setConsultingData(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.filter(si => si.item.id !== itemId)
    }))
  }

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId)
      return
    }

    setConsultingData(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.map(si =>
        si.item.id === itemId ? { ...si, quantity } : si
      )
    }))
  }

  const isWeekend = (date: Date) => {
    const day = date.getDay()
    return day === 0 || day === 6
  }

  const togglePackage = (packageId: string) => {
    setExpandedPackages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(packageId)) {
        newSet.delete(packageId)
      } else {
        newSet.add(packageId)
      }
      return newSet
    })
  }

  const selectAllItemsInPackage = (packageName: string) => {
    const packageItems = items.filter(item => {
      if (Array.isArray(item.package)) {
        return item.package.includes(packageName)
      }
      return item.package === packageName
    })
    packageItems.forEach(item => {
      const existingIndex = consultingData.selectedItems.findIndex(si => si.item.id === item.id)
      if (existingIndex < 0) {
        addItem(item)
      }
    })
    toast.success(`${packageName} 패키지의 모든 아이템이 선택되었습니다.`)
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmit = async () => {
    if (!consultingData.carInDate || !consultingData.consultant) {
      toast.error('필수 항목을 모두 입력해주세요.')
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>로딩 중...</div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">예약 정보를 찾을 수 없습니다.</p>
          <Button onClick={onBack}>돌아가기</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">컨설팅 상담 페이지</h1>
          <Button onClick={onBack} variant="outline">
            뒤로가기
          </Button>
        </div>

        {/* 고객 정보 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>고객 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>예약번호</Label>
                <p className="font-semibold">{booking.bookingNumber}</p>
              </div>
              <div>
                <Label>이름</Label>
                <p className="font-semibold">{booking.name}</p>
              </div>
              <div>
                <Label>연락처</Label>
                <p className="font-semibold">{booking.phone}</p>
              </div>
              <div>
                <Label>차종</Label>
                <p className="font-semibold">{booking.carModel}</p>
              </div>
              <div>
                <Label>방문일시</Label>
                <p className="font-semibold">
                  {new Date(booking.visitDate).toLocaleDateString('ko-KR')} {booking.visitTime}
                </p>
              </div>
              <div>
                <Label>상태</Label>
                <p className="font-semibold">{booking.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 컨설팅 정보 입력 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>컨설팅 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2.5">차량입고일자 *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {consultingData.carInDate ? (
                        consultingData.carInDate.toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      ) : (
                        <span>날짜를 선택하세요</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={consultingData.carInDate}
                      onSelect={(date) => setConsultingData(prev => ({ ...prev, carInDate: date }))}
                      disabled={(date) => 
                        date < new Date() || isWeekend(date)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="mb-2.5">담당컨설턴트 *</Label>
                <Select 
                  value={consultingData.consultant} 
                  onValueChange={(value) => setConsultingData(prev => ({ ...prev, consultant: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="컨설턴트를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="김기현">김기현</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-2.5">컨설팅 상담노트</Label>
              <Textarea
                value={consultingData.consultingNotes}
                onChange={(e) => setConsultingData(prev => ({ ...prev, consultingNotes: e.target.value }))}
                placeholder="상담 내용을 입력하세요"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* 패키지 및 옵션 선택 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 아이템 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>패키지 및 옵션</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="옵션 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 모든 옵션 보기 */}
              <div className="border rounded-lg">
                <Button
                  variant="ghost"
                  onClick={() => setShowAllItems(!showAllItems)}
                  className="w-full justify-between p-4 h-auto"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">모든 옵션 보기</span>
                    <span className="text-sm text-gray-500">전체 {filteredItems.length}개 아이템</span>
                  </div>
                  {showAllItems ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
                
                {showAllItems && (
                  <div className="border-t p-4 space-y-3">
                    {filteredItems.map(item => (
                      <div key={item.id} className="border rounded-lg p-3">
                        <div className="grid grid-cols-2 gap-4">
                          {/* 첫번째 열: 제품 정보 */}
                          <div className="flex flex-col justify-between">
                            <div>
                              <h4 className="font-semibold mb-1">{item.name}</h4>
                              <p className="text-xs text-gray-600 mb-1">
                                {Array.isArray(item.package) ? item.package.join(', ') : item.package}
                              </p>
                              <p className="text-sm text-gray-500 mb-2 line-clamp-2">{item.description}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                              <p className="font-bold text-green-600">
                                {item.price.toLocaleString()}원
                              </p>
                              <Button
                                size="sm"
                                onClick={() => addItem(item)}
                                className="w-full"
                              >
                                (옵션 추가하기)
                              </Button>
                            </div>
                          </div>
                          
                          {/* 두번째 열: 이미지 */}
                          <div className="flex items-center justify-center">
                            {item.imageUrl ? (
                              <img 
                                src={item.imageUrl} 
                                alt={item.name}
                                className="w-full h-20 object-cover rounded"
                              />
                            ) : (
                              <div className="w-full h-20 bg-gray-100 rounded flex items-center justify-center">
                                <span className="text-gray-400 text-xs">이미지 없음</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 패키지별 구성 */}
              {packages.map(packageData => {
                const packageItems = items.filter(item => {
                  const itemPackages = Array.isArray(item.package) ? item.package : [item.package]
                  return itemPackages.includes(packageData.name) && 
                    (!searchQuery || filteredItems.some(fi => fi.id === item.id))
                })
                
                if (packageItems.length === 0) return null
                
                const isExpanded = expandedPackages.has(packageData.id)
                
                return (
                  <div key={packageData.id} className="border rounded-lg">
                    <div className="flex items-center justify-between p-4">
                      <Button
                        variant="ghost"
                        onClick={() => togglePackage(packageData.id)}
                        className="flex-1 justify-between h-auto p-0"
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-semibold text-blue-600">{packageData.name} 패키지</span>
                          {packageData.description && (
                            <span className="text-sm text-gray-500">{packageData.description}</span>
                          )}
                          <span className="text-xs text-gray-400">{packageItems.length}개 아이템</span>
                        </div>
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selectAllItemsInPackage(packageData.name)}
                        className="ml-2"
                      >
                        모두선택
                      </Button>
                    </div>
                    
                    {isExpanded && (
                      <div className="border-t p-4 space-y-3">
                        {packageItems.map(item => (
                          <div key={item.id} className="border rounded-lg p-3">
                            <div className="grid grid-cols-2 gap-4">
                              {/* 첫번째 열: 제품 정보 */}
                              <div className="flex flex-col justify-between">
                                <div>
                                  <h4 className="font-semibold mb-1">{item.name}</h4>
                                  <p className="text-sm text-gray-500 mb-2 line-clamp-2">{item.description}</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <p className="font-bold text-green-600">
                                    {item.price.toLocaleString()}원
                                  </p>
                                  <Button
                                    size="sm"
                                    onClick={() => addItem(item)}
                                    className="w-full"
                                  >
                                    (옵션 추가하기)
                                  </Button>
                                </div>
                              </div>
                              
                              {/* 두번째 열: 이미지 */}
                              <div className="flex items-center justify-center">
                                {item.imageUrl ? (
                                  <img 
                                    src={item.imageUrl} 
                                    alt={item.name}
                                    className="w-full aspect-video object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-full h-20 bg-gray-100 rounded flex items-center justify-center">
                                    <span className="text-gray-400 text-xs">이미지 없음</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* 선택된 아이템 */}
          <Card>
            <CardHeader>
              <CardTitle>선택된 아이템</CardTitle>
            </CardHeader>
            <CardContent>
              {consultingData.selectedItems.length === 0 ? (
                <p className="text-gray-500 text-center py-8">선택된 아이템이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {consultingData.selectedItems.map(selectedItem => (
                    <div key={selectedItem.item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold">{selectedItem.item.name}</h4>
                          <p className="text-sm text-gray-600">
                            {Array.isArray(selectedItem.item.package) ? selectedItem.item.package.join(', ') : selectedItem.item.package}
                          </p>
                          <p className="text-sm font-bold text-green-600">
                            {selectedItem.item.price.toLocaleString()}원
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateItemQuantity(selectedItem.item.id, selectedItem.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="font-semibold w-8 text-center">{selectedItem.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateItemQuantity(selectedItem.item.id, selectedItem.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeItem(selectedItem.item.id)}
                            className="ml-2"
                          >
                            삭제
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 text-right">
                        <span className="text-lg font-bold">
                          소계: {(selectedItem.item.price * selectedItem.quantity).toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  <div className="border-t pt-4 mt-4">
                    <div className="text-right">
                      <span className="text-2xl font-bold text-red-600">
                        총 합계: {consultingData.totalPrice.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 저장 버튼 */}
        <div className="text-center">
          <Button
            onClick={handleSubmit}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg"
          >
            {isSaving ? '저장 중...' : '컨설팅완료 및 아이템예약 진행'}
          </Button>
        </div>
      </div>
    </div>
  )
}