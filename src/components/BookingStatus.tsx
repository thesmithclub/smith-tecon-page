import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { ChevronDown, ChevronUp, Package } from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { projectId, publicAnonKey } from '../utils/supabase/info'

interface BookingInfo {
  bookingNumber: string
  carModel: string
  name: string
  phone: string
  location: string
  visitDate: string
  visitTime: string
  message: string
  status: string
  createdAt: string
  updatedAt: string
}

interface ConsultingItem {
  name: string
  price: number
  package: string
}

interface ConsultingInfo {
  bookingNumber: string
  carInDate: string
  consultant: string
  consultingNotes: string
  selectedItems: ConsultingItem[]
  createdAt: string
  updatedAt: string
}

export function BookingStatus() {
  const [searchData, setSearchData] = useState({ name: '', phone: '' })
  const [booking, setBooking] = useState<BookingInfo | null>(null)
  const [consulting, setConsulting] = useState<ConsultingInfo | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isItemsOpen, setIsItemsOpen] = useState(false)
  const [isLoadingItems, setIsLoadingItems] = useState(false)

  const formatPhoneNumber = (value: string) => {
    // 숫자만 추출
    const phoneNumber = value.replace(/[^\d]/g, '')
    
    // 최대 11자리까지만 허용
    const trimmed = phoneNumber.slice(0, 11)
    
    // 포맷팅
    if (trimmed.length <= 3) {
      return trimmed
    } else if (trimmed.length <= 7) {
      return `${trimmed.slice(0, 3)}-${trimmed.slice(3)}`
    } else {
      return `${trimmed.slice(0, 3)}-${trimmed.slice(3, 7)}-${trimmed.slice(7)}`
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhone = formatPhoneNumber(e.target.value)
    setSearchData(prev => ({ ...prev, phone: formattedPhone }))
  }

  const statusSteps = [
    '신청', '담당자 확인', '접수완료', '상담대기', '상담완료', 
    '아이템준비', '차량입고', '신차검수', '아이템설치', '인도대기', '고객인도'
  ]

  const getStatusColor = (status: string) => {
    const statusColors: { [key: string]: string } = {
      '신청': 'bg-yellow-100 text-yellow-800',
      '담당자 확인': 'bg-blue-100 text-blue-800',
      '접수완료': 'bg-green-100 text-green-800',
      '상담대기': 'bg-orange-100 text-orange-800',
      '상담완료': 'bg-purple-100 text-purple-800',
      '아이템준비': 'bg-pink-100 text-pink-800',
      '차량입고': 'bg-indigo-100 text-indigo-800',
      '신차검수': 'bg-cyan-100 text-cyan-800',
      '아이템설치': 'bg-teal-100 text-teal-800',
      '인도대기': 'bg-lime-100 text-lime-800',
      '고객인도': 'bg-emerald-100 text-emerald-800'
    }
    return statusColors[status] || 'bg-gray-100 text-gray-800'
  }

  const getCurrentStepIndex = (status: string) => {
    return statusSteps.indexOf(status)
  }

  const fetchConsultingInfo = async (bookingNumber: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/admin/consulting/${bookingNumber}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      })

      const result = await response.json()

      if (result.success && result.consulting) {
        setConsulting(result.consulting)
      } else {
        setConsulting(null)
      }
    } catch (error) {
      console.error('Error fetching consulting info:', error)
      setConsulting(null)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!searchData.name || !searchData.phone) {
      toast.error('이름과 전화번호를 모두 입력해주세요.')
      return
    }

    setIsSearching(true)

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/bookings/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchData)
      })

      const result = await response.json()

      if (result.success) {
        setBooking(result.booking)
        // 예약 정보를 찾았으면 바로 컨설팅 정보도 조회
        await fetchConsultingInfo(result.booking.bookingNumber)
        toast.success('예약 정보를 찾았습니다.')
      } else {
        setBooking(null)
        setConsulting(null)
        toast.error(result.error || '예약 정보를 찾을 수 없습니다.')
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('조회 중 오류가 발생했습니다.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleItemsToggle = () => {
    setIsItemsOpen(!isItemsOpen)
  }

  const getTotalPrice = () => {
    if (!consulting || !consulting.selectedItems) return 0
    return consulting.selectedItems.reduce((total, item) => {
      const price = typeof item.price === 'number' ? item.price : 0
      return total + price
    }, 0)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="space-y-4">
        <div>
          <Label htmlFor="searchName" className="mb-2.5">이름</Label>
          <Input
            id="searchName"
            value={searchData.name}
            onChange={(e) => setSearchData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="이름을 입력하세요"
          />
        </div>
        <div>
          <Label htmlFor="searchPhone" className="mb-2.5">전화번호</Label>
          <Input
            id="searchPhone"
            value={searchData.phone}
            onChange={handlePhoneChange}
            placeholder="010-0000-0000"
            maxLength={13}
          />
        </div>
        <Button 
          type="submit" 
          className="w-full"
          disabled={isSearching}
        >
          {isSearching ? '조회 중...' : '조회하기'}
        </Button>
      </form>

      {booking && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>예약 정보</span>
              <Badge className={getStatusColor(booking.status)}>
                {booking.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">예약번호</p>
                <p className="font-semibold">{booking.bookingNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">차종</p>
                <p className="font-semibold">{booking.carModel}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">이름</p>
                <p className="font-semibold">{booking.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">연락처</p>
                <p className="font-semibold">{booking.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">방문지점</p>
                <p className="font-semibold">{booking.location}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">방문예정일시</p>
                <p className="font-semibold">
                  {new Date(booking.visitDate).toLocaleDateString('ko-KR')} {booking.visitTime}
                </p>
              </div>
              {consulting && consulting.carInDate && (
                <div>
                  <p className="text-sm text-gray-600">차량 입고일정</p>
                  <p className="font-semibold">
                    {new Date(consulting.carInDate).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              )}
            </div>

            {booking.message && (
              <div>
                <p className="text-sm text-gray-600">코멘트</p>
                <p className="font-semibold">{booking.message}</p>
              </div>
            )}

            {/* 진행 상태 표시 */}
            <div className="mt-6">
              <p className="text-sm text-gray-600 mb-4">진행 상황</p>
              <p className="text-lg font-medium text-gray-900 mb-4">
                현재 단계: {statusSteps[getCurrentStepIndex(booking.status)]}
              </p>
              <Progress 
                value={((getCurrentStepIndex(booking.status) + 1) / statusSteps.length) * 100} 
                className="w-full"
              />
            </div>

            {/* 선택하신 아이템 섹션 */}
            {consulting && consulting.selectedItems && consulting.selectedItems.length > 0 && (
              <div className="mt-6">
                <Collapsible open={isItemsOpen} onOpenChange={setIsItemsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full flex items-center justify-between"
                      onClick={handleItemsToggle}
                    >
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        선택하신 아이템 ({consulting.selectedItems.length}개)
                      </div>
                      {isItemsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>선택된 아이템</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {consulting.selectedItems.map((selectedItem, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-semibold">{selectedItem.name || selectedItem.item?.name}</h4>
                                  <p className="text-sm text-gray-600">
                                    {Array.isArray(selectedItem.package) 
                                      ? selectedItem.package.join(', ') 
                                      : (selectedItem.package || selectedItem.item?.package)}
                                  </p>
                                  <p className="text-sm font-bold text-green-600">
                                    {((selectedItem.price || selectedItem.item?.price) || 0).toLocaleString()}원
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">수량: {selectedItem.quantity || 1}</span>
                                </div>
                              </div>
                              <div className="mt-2 text-right">
                                <span className="text-lg font-bold">
                                  소계: {(((selectedItem.price || selectedItem.item?.price) || 0) * (selectedItem.quantity || 1)).toLocaleString()}원
                                </span>
                              </div>
                            </div>
                          ))}
                          
                          <div className="border-t pt-4 mt-4">
                            <div className="text-right">
                              <span className="text-2xl font-bold text-red-600">
                                총 합계: {consulting.selectedItems.reduce((total, item) => {
                                  const price = item.price || item.item?.price || 0
                                  const quantity = item.quantity || 1
                                  return total + (price * quantity)
                                }, 0).toLocaleString()}원
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            <div className="text-xs text-gray-500 mt-4">
              <p>접수일: {new Date(booking.createdAt).toLocaleString('ko-KR')}</p>
              <p>최종 업데이트: {new Date(booking.updatedAt).toLocaleString('ko-KR')}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}