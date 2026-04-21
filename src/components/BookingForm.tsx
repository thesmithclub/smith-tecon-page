import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { Calendar } from './ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { CalendarIcon } from 'lucide-react'

import { toast } from 'sonner@2.0.3'
import { projectId, publicAnonKey } from '../utils/supabase/info'

interface FormData {
  bookingNumber: string
  carModel: string
  name: string
  phone: string
  location: string
  visitDate: Date | undefined
  visitTime: string
  message: string
}

export function BookingForm() {
  const [formData, setFormData] = useState<FormData>({
    bookingNumber: '',
    carModel: '',
    name: '',
    phone: '',
    location: '',
    visitDate: undefined,
    visitTime: '',
    message: ''
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [bookingNumber, setBookingNumber] = useState('')

  const timeSlots = [
    '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'
  ]

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

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
    handleInputChange('phone', formattedPhone)
  }

  const isWeekend = (date: Date) => {
    const day = date.getDay()
    return day === 0 || day === 6 // 일요일(0) 또는 토요일(6)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.bookingNumber || !formData.carModel || !formData.name || !formData.phone || 
        !formData.location || !formData.visitDate || !formData.visitTime) {
      toast.error('모든 필수 항목을 입력해주세요.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bookingNumber: formData.bookingNumber,
          carModel: formData.carModel,
          name: formData.name,
          phone: formData.phone,
          location: formData.location,
          visitDate: formData.visitDate.toISOString(),
          visitTime: formData.visitTime,
          message: formData.message
        })
      })

      const result = await response.json()

      if (result.success) {
        setBookingNumber(result.bookingNumber)
        setIsSubmitted(true)
        toast.success('예약이 성공적으로 접수되었습니다!')
      } else {
        toast.error('예약 접수에 실패했습니다. 다시 시도해주세요.')
      }
    } catch (error) {
      console.error('Booking submission error:', error)
      toast.error('예약 접수 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <h2 className="text-2xl font-bold text-green-600 mb-4">접수 완료</h2>
        <p className="text-lg mb-2">예약번호: <span className="font-bold text-blue-600">{bookingNumber}</span></p>
        <div className="bg-gray-50 p-6 rounded-lg my-6">
          <p className="mb-4">담당자가 내용을 확인 후 고객님께 전화드릴 예정입니다.</p>
          <p>기타 궁금하신 사항은</p>
          <p className="font-bold">테슬라 컨설팅 서비스 상담 번호 "010-0000-0000"로 연락 주세요.</p>
        </div>
        <Button onClick={() => {
          setIsSubmitted(false)
          setFormData({
            bookingNumber: '',
            carModel: '',
            name: '',
            phone: '',
            location: '',
            visitDate: undefined,
            visitTime: '',
            message: ''
          })
        }}>
          새 예약 신청
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-bold mb-6">예약 신청서</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 첫 번째 줄 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="bookingNumber" className="mb-2 block">테슬라 예약번호 *</Label>
            <Input
              id="bookingNumber"
              value={formData.bookingNumber}
              onChange={(e) => handleInputChange('bookingNumber', e.target.value)}
              placeholder="테슬라 예약번호를 입력하세요"
            />
          </div>
          <div>
            <Label htmlFor="carModel" className="mb-2 block">상담을 원하는 차종 *</Label>
            <Select value={formData.carModel} onValueChange={(value) => handleInputChange('carModel', value)}>
              <SelectTrigger>
                <SelectValue placeholder="차종을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Model 3">Model 3</SelectItem>
                <SelectItem value="Model Y">Model Y</SelectItem>
                <SelectItem value="Model X">Model X</SelectItem>
                <SelectItem value="Model S">Model S</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 두 번째 줄 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="name" className="mb-2 block">이름 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="이름을 입력하세요"
            />
          </div>
          <div>
            <Label htmlFor="phone" className="mb-2 block">연락처 *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={handlePhoneChange}
              placeholder="010-0000-0000"
              maxLength={13}
            />
          </div>
        </div>

        {/* 세 번째 줄 */}
        <div>
          <Label htmlFor="location" className="mb-2 block">
            방문희망지점 *
            <span className="text-xs text-gray-500 font-normal ml-1">(상담서비스는 더 스미스 본사에서만 가능하며, 점차 확대운영할 예정입니다.)</span>
          </Label>
          <Select value={formData.location} onValueChange={(value) => handleInputChange('location', value)}>
            <SelectTrigger>
              <SelectValue placeholder="지점을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="더 스미스 본사">더 스미스 본사</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 네 번째 줄 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="mb-2 block">방문희망일자 *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.visitDate ? (
                    formData.visitDate.toLocaleDateString('ko-KR', {
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
                  selected={formData.visitDate}
                  onSelect={(date) => handleInputChange('visitDate', date)}
                  disabled={(date) => 
                    date < new Date() || isWeekend(date)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="visitTime" className="mb-2 block">방문희망시간 *</Label>
            <Select value={formData.visitTime} onValueChange={(value) => handleInputChange('visitTime', value)}>
              <SelectTrigger>
                <SelectValue placeholder="시간을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 다섯 번째 줄 */}
        <div>
          <Label htmlFor="message" className="mb-2 block">코멘트</Label>
          <Textarea
            id="message"
            value={formData.message}
            onChange={(e) => handleInputChange('message', e.target.value)}
            placeholder="상담 관련 문의사항이나 요청사항을 입력하세요"
            rows={4}
          />
        </div>

        <Button 
          type="submit" 
          className="w-full bg-red-600 hover:bg-red-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? '접수 중...' : '접수하기'}
        </Button>
      </form>
    </div>
  )
}