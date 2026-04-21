import React, { useState } from 'react'
import { Button } from './ui/button'
import { ImageWithFallback } from './figma/ImageWithFallback'

interface AdminLoginProps {
  onLogin: () => void
  onBackToHome: () => void
}

export function AdminLogin({ onLogin, onBackToHome }: AdminLoginProps) {
  const [credentials, setCredentials] = useState({
    id: '',
    password: ''
  })
  const [loginError, setLoginError] = useState('')

  const handleLogin = () => {
    if (credentials.id === 'admin' && credentials.password === 'smith2121!') {
      setLoginError('')
      setCredentials({ id: '', password: '' })
      onLogin()
    } else {
      setLoginError('아이디 또는 비밀번호가 올바르지 않습니다.')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && credentials.id && credentials.password) {
      handleLogin()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 이미지 */}
      <div className="relative bg-black">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1717091238218-582d6904dad6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZXNsYSUyMGNhciUyMGVsZWN0cmljJTIwbW9kZXJufGVufDF8fHx8MTc1OTI5NjkzMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Tesla Admin Login"
          className="w-full h-64 object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <h1 className="text-3xl md:text-5xl text-white font-bold text-center">
            관리자 로그인
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-6">
        <div className="mt-8 p-8 bg-white rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">관리자 인증</h2>
            <Button onClick={onBackToHome} variant="outline" size="sm">
              메인으로
            </Button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="admin-id" className="block text-sm font-medium text-gray-700 mb-1">
                아이디
              </label>
              <input
                type="text"
                id="admin-id"
                value={credentials.id}
                onChange={(e) => setCredentials(prev => ({ ...prev, id: e.target.value }))}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="아이디를 입력하세요"
              />
            </div>
            
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                type="password"
                id="admin-password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="비밀번호를 입력하세요"
              />
            </div>
            
            {loginError && (
              <p className="text-red-600 text-sm">{loginError}</p>
            )}
            
            <Button 
              onClick={handleLogin} 
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={!credentials.id || !credentials.password}
            >
              로그인
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}