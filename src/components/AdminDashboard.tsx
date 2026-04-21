import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { toast } from 'sonner@2.0.3'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { ArrowUpDown, X, ChevronDown, ChevronRight, Minus, Plus } from 'lucide-react'

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
  createdAt: string
  updatedAt: string
  carArrivalDate?: string // 입고일정 추가
  isDeleted?: boolean // 삭제 상태 추가
}

interface Consulting {
  bookingNumber: string
  carArrivalDate: string
  consultant: string
  consultingNotes: string
  selectedItems: any[]
  createdAt: string
  updatedAt: string
}

interface AdminDashboardProps {
  onConsulting: (bookingNumber: string) => void
  onItemAdmin: () => void
  onLogout: () => void
}

export function AdminDashboard({ onConsulting, onItemAdmin, onLogout }: AdminDashboardProps) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [consultings, setConsultings] = useState<Consulting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'visitDate' | 'createdAt' | 'name'>('visitDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchBy, setSearchBy] = useState<'name' | 'booking' | 'phone'>('name')
  const [currentPage, setCurrentPage] = useState(1)
  const [deletedSearchTerm, setDeletedSearchTerm] = useState('')
  const [deletedSearchBy, setDeletedSearchBy] = useState<'name' | 'booking' | 'phone'>('name')
  const [deletedCurrentPage, setDeletedCurrentPage] = useState(1)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const statusOptions = [
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

  const getStatusCounts = () => {
    const activeBookings = bookings.filter(booking => !booking.isDeleted)
    const counts: { [key: string]: number } = {}
    statusOptions.forEach(status => {
      counts[status] = activeBookings.filter(booking => booking.status === status).length
    })
    return counts
  }

  useEffect(() => {
    fetchBookings()
    fetchConsultings()
  }, [])



  const fetchBookings = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15초 타임아웃

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/admin/bookings`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const result = await response.json()

      if (result.success) {
        setBookings(result.bookings || [])
      } else {
        toast.error('예약 목록을 불러오는데 실패했습니다.')
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        toast.error('요청 시간이 초과되었습니다. 다시 시도해주세요.')
      } else {
        console.error('Fetch bookings error:', error)
        toast.error('예약 목록 조회 중 오류가 발생했습니다.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const fetchConsultings = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/admin/consultings`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      })

      const result = await response.json()

      if (result.success) {
        setConsultings(result.consultings || [])
      } else {
        console.error('컨설팅 목록 조회 실패:', result.error)
      }
    } catch (error) {
      console.error('Fetch consultings error:', error)
    }
  }

  const updateBookingStatus = async (bookingNumber: string, newStatus: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/admin/bookings/${bookingNumber}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      const result = await response.json()

      if (result.success) {
        setBookings(prev => 
          prev.map(booking => 
            booking.bookingNumber === bookingNumber 
              ? { ...booking, status: newStatus, updatedAt: new Date().toISOString() }
              : booking
          )
        )
        toast.success('상태가 업데이트되었습니다.')
      } else {
        toast.error('상태 업데이트에 실패했습니다.')
      }
    } catch (error) {
      console.error('Update status error:', error)
      toast.error('상태 업데이트 중 오류가 발생했습니다.')
    }
  }

  const deleteBooking = async (bookingNumber: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/admin/bookings/${bookingNumber}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isDeleted: true })
      })
      const result = await response.json()
      if (result.success) {
        setBookings(prev =>
          prev.map(booking =>
            booking.bookingNumber === bookingNumber
              ? { ...booking, isDeleted: true }
              : booking
          )
        )
        toast.success('예약이 취소/삭제되었습니다.')
      } else {
        toast.error('삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Delete booking error:', error)
      toast.error('예약 삭제 중 오류가 발생했습니다.')
    }
  }

  const permanentDeleteBooking = async (bookingNumber: string) => {
    if (!window.confirm('완전 삭제하면 복원할 수 없습니다. 정말 삭제하시겠습니까?')) return
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/admin/bookings/${bookingNumber}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      })
      const result = await response.json()
      if (result.success) {
        setBookings(prev => prev.filter(booking => booking.bookingNumber !== bookingNumber))
        toast.success('예약이 완전 삭제되었습니다.')
      } else {
        toast.error('완전 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Permanent delete error:', error)
      toast.error('완전 삭제 중 오류가 발생했습니다.')
    }
  }

  const restoreBooking = async (bookingNumber: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/admin/bookings/${bookingNumber}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isDeleted: false })
      })
      const result = await response.json()
      if (result.success) {
        setBookings(prev =>
          prev.map(booking =>
            booking.bookingNumber === bookingNumber
              ? { ...booking, isDeleted: false }
              : booking
          )
        )
        toast.success('예약이 복원되었습니다.')
      } else {
        toast.error('복원에 실패했습니다.')
      }
    } catch (error) {
      console.error('Restore booking error:', error)
      toast.error('예약 복원 중 오류가 발생했습니다.')
    }
  }

  const handleSort = (field: 'visitDate' | 'createdAt' | 'name') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setCurrentPage(1)
  }

  const getFilteredAndSortedBookings = (includeDeleted: boolean = false) => {
    const filteredBookings = bookings.filter(booking => {
      if (includeDeleted && !booking.isDeleted) return false
      if (!includeDeleted && booking.isDeleted) return false

      const term = includeDeleted ? deletedSearchTerm : searchTerm
      const searchField = includeDeleted ? deletedSearchBy : searchBy

      if (!term) return true

      switch (searchField) {
        case 'name':
          return booking.name.toLowerCase().includes(term.toLowerCase())
        case 'booking':
          return booking.bookingNumber.toLowerCase().includes(term.toLowerCase())
        case 'phone':
          return booking.phone.includes(term)
        default:
          return true
      }
    })

    return filteredBookings.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'visitDate':
          aValue = new Date(`${a.visitDate} ${a.visitTime}`)
          bValue = new Date(`${b.visitDate} ${b.visitTime}`)
          break
        case 'createdAt':
          aValue = new Date(a.createdAt)
          bValue = new Date(b.createdAt)
          break
        case 'name':
          aValue = a.name
          bValue = b.name
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }

  const getPagedBookings = (includeDeleted: boolean = false) => {
    const sorted = getFilteredAndSortedBookings(includeDeleted)
    const pageSize = includeDeleted ? 5 : 10
    const page = includeDeleted ? deletedCurrentPage : currentPage
    const startIndex = (page - 1) * pageSize
    return sorted.slice(startIndex, startIndex + pageSize)
  }

  const getTotalPages = (includeDeleted: boolean = false) => {
    const total = getFilteredAndSortedBookings(includeDeleted).length
    const pageSize = includeDeleted ? 5 : 10
    return Math.ceil(total / pageSize)
  }

  const getConsultingForBooking = (bookingNumber: string) => {
    return consultings.find(consulting => consulting.bookingNumber === bookingNumber)
  }

  const toggleItemsExpansion = (bookingNumber: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(bookingNumber)) {
        newSet.delete(bookingNumber)
      } else {
        newSet.add(bookingNumber)
      }
      return newSet
    })
  }

  const statusCounts = getStatusCounts()
  const activeBookings = getPagedBookings(false)
  const deletedBookings = getPagedBookings(true)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">관리자 대시보드</h1>
          <div className="flex gap-4">

            <Button onClick={onItemAdmin} variant="outline">
              Item Admin
            </Button>
            <Button onClick={onLogout} variant="outline">
              로그아웃
            </Button>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">전체 예약</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings.filter(b => !b.isDeleted).length}</div>
            </CardContent>
          </Card>
          {statusOptions.slice(0, 5).map(status => (
            <Card key={status}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{status}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statusCounts[status] || 0}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 전체 진행상황 개요 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>전체 진행상황 개요</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 justify-center">
              {statusOptions.map((step, index) => {
                const count = statusCounts[step] || 0
                
                return (
                  <div key={step} className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold border-2 ${
                        count > 0
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-gray-100 text-gray-400 border-gray-300'
                      }`}
                    >
                      {count}
                    </div>
                    <span className={`text-xs mt-1 text-center max-w-16 ${
                      count > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
                    }`}>
                      {step}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* 예약 목록 테이블 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>예약 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {/* 검색 영역 */}
            <div className="flex gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <Select value={searchBy} onValueChange={(value: 'name' | 'booking' | 'phone') => setSearchBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="검색조건" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">이름</SelectItem>
                  <SelectItem value="booking">예약번호</SelectItem>
                  <SelectItem value="phone">연락처</SelectItem>
                </SelectContent>
              </Select>
              <input 
                type="text"
                placeholder="검색어를 입력하세요"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setCurrentPage(1)}
              >
                검색
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>예약번호</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead>차종</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('visitDate')}>
                      <div className="flex items-center gap-1">
                        방문일시
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead>입고일정</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('createdAt')}>
                      <div className="flex items-center gap-1">
                        접수일
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeBookings.map((booking) => {
                    const consulting = getConsultingForBooking(booking.bookingNumber)
                    const hasSelectedItems = consulting && consulting.selectedItems && consulting.selectedItems.length > 0
                    const isExpanded = expandedItems.has(booking.bookingNumber)
                    const totalPrice = hasSelectedItems 
                      ? consulting.selectedItems.reduce((total, item) => total + (item.item.price * item.quantity), 0)
                      : 0

                    return (
                      <React.Fragment key={booking.bookingNumber}>
                        <TableRow>
                          <TableCell className="font-medium">
                            {booking.bookingNumber}
                          </TableCell>
                          <TableCell>{booking.name}</TableCell>
                          <TableCell>{booking.carModel}</TableCell>
                          <TableCell>{booking.phone}</TableCell>
                          <TableCell>
                            {new Date(booking.visitDate).toLocaleDateString('ko-KR')} {booking.visitTime}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              if (consulting && consulting.carInDate) {
                                return (
                                  <span className="text-green-600 font-medium">
                                    {new Date(consulting.carInDate).toLocaleDateString('ko-KR')}
                                  </span>
                                )
                              }
                              return (
                                <span className="text-gray-500 text-sm">상담전입니다.</span>
                              )
                            })()}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <Select
                                value={booking.status}
                                onValueChange={(value) => updateBookingStatus(booking.bookingNumber, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue>
                                    <Badge className={getStatusColor(booking.status)}>
                                      {booking.status}
                                    </Badge>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {statusOptions.map((status) => (
                                    <SelectItem key={status} value={status}>
                                      {status}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(booking.createdAt).toLocaleDateString('ko-KR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => onConsulting(booking.bookingNumber)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                컨설팅 진행 / 내역
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteBooking(booking.bookingNumber)}
                              >
                                취소/삭제
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        {/* 선택된 아이템 표시 */}
                        {isExpanded && hasSelectedItems && (
                          <TableRow>
                            <TableCell colSpan={9} className="p-0">
                              <div className="bg-gray-50 p-4">
                                <Card>
                                  <CardHeader>
                                    <CardTitle>선택된 아이템</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-3">
                                      {consulting.selectedItems.map(selectedItem => (
                                        <div key={selectedItem.item.id} className="border rounded-lg p-4 bg-white">
                                          <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                              <h4 className="font-semibold">{selectedItem.item.name}</h4>
                                              <p className="text-sm text-gray-600">
                                                {Array.isArray(selectedItem.item.package) 
                                                  ? selectedItem.item.package.join(', ') 
                                                  : selectedItem.item.package}
                                              </p>
                                              <p className="text-sm font-bold text-green-600">
                                                {selectedItem.item.price.toLocaleString()}원
                                              </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold">수량: {selectedItem.quantity}</span>
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
                                            총 합계: {totalPrice.toLocaleString()}원
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* 페이지네이션 */}
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                {((currentPage - 1) * 10) + 1}-{Math.min(currentPage * 10, getFilteredAndSortedBookings(false).length)} of {getFilteredAndSortedBookings(false).length} results
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  이전
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === getTotalPages(false)}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  다음
                </Button>
              </div>
            </div>

            {activeBookings.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                등록된 예약이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>

        {/* 취소 및 삭제 상담고객 세션 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <X className="w-5 h-5 text-red-500" />
              취소 및 삭제 상담고객
              <Badge variant="secondary" className="ml-auto">
                {bookings.filter(b => b.isDeleted).length}명
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* 검색 영역 */}
            <div className="flex gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <Select value={deletedSearchBy} onValueChange={(value: 'name' | 'booking' | 'phone') => setDeletedSearchBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="검색조건" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">이름</SelectItem>
                  <SelectItem value="booking">예약번호</SelectItem>
                  <SelectItem value="phone">연락처</SelectItem>
                </SelectContent>
              </Select>
              <input 
                type="text"
                placeholder="검색어를 입력하세요"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={deletedSearchTerm}
                onChange={(e) => setDeletedSearchTerm(e.target.value)}
              />
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setDeletedCurrentPage(1)}
              >
                검색
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>예약번호</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead>차종</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>방문일시</TableHead>
                    <TableHead>입고일정</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>접수일</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deletedBookings.map((booking) => {
                    const consulting = getConsultingForBooking(booking.bookingNumber)
                    const hasSelectedItems = consulting && consulting.selectedItems && consulting.selectedItems.length > 0
                    const isExpanded = expandedItems.has(booking.bookingNumber + '_deleted')
                    const totalPrice = hasSelectedItems 
                      ? consulting.selectedItems.reduce((total, item) => total + (item.item.price * item.quantity), 0)
                      : 0

                    return (
                      <React.Fragment key={booking.bookingNumber}>
                        <TableRow className="opacity-60">
                          <TableCell className="font-medium">
                            {booking.bookingNumber}
                          </TableCell>
                          <TableCell>{booking.name}</TableCell>
                          <TableCell>{booking.carModel}</TableCell>
                          <TableCell>{booking.phone}</TableCell>
                          <TableCell>
                            {new Date(booking.visitDate).toLocaleDateString('ko-KR')} {booking.visitTime}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              if (consulting && consulting.carInDate) {
                                return (
                                  <span className="text-green-600 font-medium">
                                    {new Date(consulting.carInDate).toLocaleDateString('ko-KR')}
                                  </span>
                                )
                              }
                              return (
                                <span className="text-gray-500 text-sm">상담전입니다.</span>
                              )
                            })()}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <Badge variant="destructive">
                                취소됨
                              </Badge>

                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(booking.createdAt).toLocaleDateString('ko-KR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => restoreBooking(booking.bookingNumber)}
                              >
                                복원
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => permanentDeleteBooking(booking.bookingNumber)}
                              >
                                완전 삭제
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        {/* 선택된 아이템 표시 */}
                        {isExpanded && hasSelectedItems && (
                          <TableRow className="opacity-60">
                            <TableCell colSpan={9} className="p-0">
                              <div className="bg-gray-50 p-4">
                                <Card>
                                  <CardHeader>
                                    <CardTitle>선택된 아이템</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-3">
                                      {consulting.selectedItems.map(selectedItem => (
                                        <div key={selectedItem.item.id} className="border rounded-lg p-4 bg-white">
                                          <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                              <h4 className="font-semibold">{selectedItem.item.name}</h4>
                                              <p className="text-sm text-gray-600">
                                                {Array.isArray(selectedItem.item.package) 
                                                  ? selectedItem.item.package.join(', ') 
                                                  : selectedItem.item.package}
                                              </p>
                                              <p className="text-sm font-bold text-green-600">
                                                {selectedItem.item.price.toLocaleString()}원
                                              </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold">수량: {selectedItem.quantity}</span>
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
                                            총 합계: {totalPrice.toLocaleString()}원
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* 페이지네이션 */}
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                {((deletedCurrentPage - 1) * 5) + 1}-{Math.min(deletedCurrentPage * 5, getFilteredAndSortedBookings(true).length)} of {getFilteredAndSortedBookings(true).length} results
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={deletedCurrentPage === 1}
                  onClick={() => setDeletedCurrentPage(deletedCurrentPage - 1)}
                >
                  이전
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={deletedCurrentPage === getTotalPages(true)}
                  onClick={() => setDeletedCurrentPage(deletedCurrentPage + 1)}
                >
                  다음
                </Button>
              </div>
            </div>

            {deletedBookings.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                취소된 예약이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}