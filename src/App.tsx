import React, { useState, useEffect } from 'react'
import { Button } from './components/ui/button'
import { BookingForm } from './components/BookingForm'
import { BookingStatus } from './components/BookingStatus'
import { AdminDashboard } from './components/AdminDashboard'
import { AdminLogin } from './components/AdminLogin'
import { ConsultingPage } from './components/ConsultingPage'
import { ItemAdmin } from './components/ItemAdmin'
import { ImageWithFallback } from './components/figma/ImageWithFallback'
import { Toaster } from './components/ui/sonner'
import { supabase } from './utils/supabase/client'

type Page = 'home' | 'status' | 'admin' | 'admin_login' | 'consulting' | 'item-admin'

interface AppState {
  currentPage: Page
  isAdmin: boolean
  selectedBookingNumber?: string
}

export default function App() {
  const [state, setState] = useState<AppState>({
    currentPage: 'home',
    isAdmin: false
  })

  const base = import.meta.env.BASE_URL.replace(/\/$/, '')

  const getRelativePath = () => {
    const path = window.location.pathname
    return path.startsWith(base) ? path.slice(base.length) || '/' : path
  }

  // URL 기반 라우팅을 위한 초기화 및 감지
  useEffect(() => {
    const applyRoute = (isLoggedIn: boolean) => {
      const path = getRelativePath()
      if (path === '/admin' || path.startsWith('/admin/')) {
        if (isLoggedIn) {
          setState(prev => ({ ...prev, isAdmin: true, currentPage: 'admin' }))
        } else {
          setState(prev => ({ ...prev, currentPage: 'admin_login' }))
        }
      }
    }

    // Supabase 세션 초기 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      applyRoute(!!session)
    })

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(prev => ({ ...prev, isAdmin: !!session }))
    })

    const handlePopState = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const path = getRelativePath()
        if (path === '/admin' || path.startsWith('/admin/')) {
          if (session) {
            setState(prev => ({ ...prev, isAdmin: true, currentPage: 'admin' }))
          } else {
            setState(prev => ({ ...prev, currentPage: 'admin_login' }))
          }
        } else {
          setState(prev => ({ ...prev, currentPage: 'home' }))
        }
      })
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      subscription.unsubscribe()
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const handleAdminLogin = () => {
    window.history.pushState({}, '', base + '/admin/dashboard')
    setState(prev => ({ ...prev, isAdmin: true, currentPage: 'admin' }))
  }

  const handleConsulting = (bookingNumber: string) => {
    setState(prev => ({
      ...prev,
      currentPage: 'consulting',
      selectedBookingNumber: bookingNumber
    }))
  }

  const navigateTo = (page: Page) => {
    if (page === 'home') {
      window.history.pushState({}, '', base + '/')
    } else if (page === 'admin_login') {
      window.history.pushState({}, '', base + '/admin')
    }
    setState(prev => ({ ...prev, currentPage: page }))
  }

  const renderCurrentPage = () => {
    switch (state.currentPage) {
      case 'home':
        return (
          <div className="min-h-screen bg-gray-50">
            {/* 헤더 이미지 및 제목 */}
            <div className="relative bg-black">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1717091238218-582d6904dad6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZXNsYSUyMGNhciUyMGVsZWN0cmljJTIwbW9kZXJufGVufDF8fHx8MTc1OTI5NjkzMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Tesla Consulting Service"
                className="w-full h-96 object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                <h1 className="text-4xl md:text-6xl text-white font-bold text-center">
                  테슬라 컨설팅 서비스 신청접수
                </h1>
              </div>
            </div>

            <div className="max-w-4xl mx-auto p-6">
              {/* 조회 링크 */}
              <div className="text-center my-8">
                <p className="text-gray-600 mb-4 text-[15px]">
                  이미 접수를 하셨다면 신청 진행상황을 조회해 보세요
                </p>
                <Button 
                  onClick={() => navigateTo('status')}
                  variant="outline"
                  className="mx-2"
                >
                  진행상황 조회
                </Button>

              </div>

              {/* 예약 신청 폼 */}
              <BookingForm />
            </div>
          </div>
        )

      case 'status':
        return (
          <div className="min-h-screen bg-gray-50">
            <div className="max-w-2xl mx-auto p-6">
              <div className="bg-white rounded-lg shadow-md p-8">
                <div className="flex items-center justify-between mb-2.5">
                  <h1 className="text-2xl font-bold">예약 진행상황 조회</h1>
                  <Button onClick={() => navigateTo('home')} variant="outline">
                    메인으로
                  </Button>
                </div>
                <div className="mb-8">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1725429976920-492648a26ac7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9ncmVzcyUyMHRyYWNraW5nJTIwZGVsaXZlcnklMjBzdGF0dXN8ZW58MXx8fHwxNzU5MzAwOTc4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="예약 진행상황 조회"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                </div>
                <div className="border-t border-gray-200 pt-8 mt-8">
                  <BookingStatus />
                </div>
              </div>
            </div>
          </div>
        )

      case 'admin_login':
        return (
          <AdminLogin
            onLogin={handleAdminLogin}
            onBackToHome={() => navigateTo('home')}
          />
        )

      case 'admin':
        return (
          <AdminDashboard
            onConsulting={handleConsulting}
            onItemAdmin={() => navigateTo('item-admin')}
            onLogout={async () => {
              await supabase.auth.signOut()
              window.history.pushState({}, '', base + '/')
              setState({ currentPage: 'home', isAdmin: false })
            }}
          />
        )

      case 'consulting':
        return (
          <ConsultingPage
            bookingNumber={state.selectedBookingNumber!}
            onBack={() => navigateTo('admin')}
          />
        )

      case 'item-admin':
        return (
          <ItemAdmin
            onBack={() => navigateTo('admin')}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen">
      {renderCurrentPage()}
      <Toaster />
    </div>
  )
}