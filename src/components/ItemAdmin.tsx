import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Badge } from './ui/badge'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { projectId, publicAnonKey } from '../utils/supabase/info'

interface Item {
  id: string
  name: string
  package: string | string[]
  imageUrl: string
  description: string
  price: number
  createdAt: string
  updatedAt: string
}

interface ItemFormData {
  name: string
  package: string[]
  imageUrl: string
  description: string
  price: number
}

interface Package {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

interface PackageFormData {
  name: string
  description: string
}

interface ItemAdminProps {
  onBack: () => void
}

export function ItemAdmin({ onBack }: ItemAdminProps) {
  const [items, setItems] = useState<Item[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [formData, setFormData] = useState<ItemFormData>({
    name: '',
    package: [],
    imageUrl: '',
    description: '',
    price: 0
  })
  const [packageFormData, setPackageFormData] = useState<PackageFormData>({
    name: '',
    description: ''
  })

  useEffect(() => {
    fetchItems()
    fetchPackages()
  }, [])

  const fetchItems = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15초 타임아웃

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/items`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const result = await response.json()

      if (result.success) {
        setItems(result.items || [])
      } else {
        toast.error('아이템 목록을 불러오는데 실패했습니다.')
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        toast.error('요청 시간이 초과되었습니다. 다시 시도해주세요.')
      } else {
        console.error('Fetch items error:', error)
        toast.error('아이템 목록 조회 중 오류가 발생했습니다.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPackages = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15초 타임아웃

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/packages`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const result = await response.json()

      if (result.success) {
        setPackages(result.packages || [])
      } else {
        toast.error('패키지 목록을 불러오는데 실패했습니다.')
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        toast.error('요청 시간이 초과되었습니다. 다시 시도해주세요.')
      } else {
        console.error('Fetch packages error:', error)
        toast.error('패키지 목록 조회 중 오류가 발생했습니다.')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      package: [],
      imageUrl: '',
      description: '',
      price: 0
    })
    setEditingItem(null)
  }

  const resetPackageForm = () => {
    setPackageFormData({
      name: '',
      description: ''
    })
    setEditingPackage(null)
  }

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openAddPackageDialog = () => {
    resetPackageForm()
    setIsPackageDialogOpen(true)
  }

  const openEditPackageDialog = (pkg: Package) => {
    setPackageFormData({
      name: pkg.name,
      description: pkg.description
    })
    setEditingPackage(pkg)
    setIsPackageDialogOpen(true)
  }

  const openEditDialog = (item: Item) => {
    setFormData({
      name: item.name,
      package: Array.isArray(item.package) ? item.package : [item.package],
      imageUrl: item.imageUrl,
      description: item.description,
      price: item.price
    })
    setEditingItem(item)
    setIsDialogOpen(true)
  }

  const handleSavePackage = async () => {
    if (!packageFormData.name) {
      toast.error('패키지 이름을 입력해주세요.')
      return
    }

    try {
      const url = editingPackage
        ? `https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/packages/${editingPackage.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/packages`

      const response = await fetch(url, {
        method: editingPackage ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(packageFormData)
      })

      const result = await response.json()

      if (result.success) {
        if (editingPackage) {
          setPackages(prev => 
            prev.map(pkg => 
              pkg.id === editingPackage.id ? result.package : pkg
            )
          )
          toast.success('패키지가 수정되었습니다.')
        } else {
          setPackages(prev => [...prev, result.package])
          toast.success('패키지가 추가되었습니다.')
        }
        
        setIsPackageDialogOpen(false)
        resetPackageForm()
      } else {
        toast.error('저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('Save package error:', error)
      toast.error('저장 중 오류가 발생했습니다.')
    }
  }

  const handleSave = async () => {
    if (!formData.name || formData.package.length === 0 || formData.price <= 0) {
      toast.error('모든 필수 항목을 입력해주세요.')
      return
    }

    try {
      console.log('Saving item with data:', formData)
      console.log('Image URL in formData:', formData.imageUrl)
      console.log('Editing existing item:', editingItem ? editingItem.id : 'No')
      
      const url = editingItem
        ? `https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/items/${editingItem.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/items`

      console.log('Making request to:', url)
      console.log('Request body:', JSON.stringify(formData, null, 2))

      const response = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      console.log('Response status:', response.status)
      const result = await response.json()
      console.log('Response result:', result)

      if (result.success) {
        if (editingItem) {
          setItems(prev => 
            prev.map(item => 
              item.id === editingItem.id ? result.item : item
            )
          )
          toast.success('아이템이 수정되었습니다.')
          console.log('Item updated successfully:', result.item)
        } else {
          setItems(prev => [...prev, result.item])
          toast.success('아이템이 추가되었습니다.')
          console.log('Item added successfully:', result.item)
        }
        
        setIsDialogOpen(false)
        resetForm()
        // 데이터 새로고침
        fetchItems()
        fetchPackages()
      } else {
        console.error('Save failed:', result)
        toast.error(`저장에 실패했습니다: ${result.error || '알 수 없는 오류'}`)
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('저장 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (item: Item) => {
    if (!confirm(`"${item.name}" 아이템을 삭제하시겠습니까?`)) {
      return
    }

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/items/${item.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      })

      const result = await response.json()

      if (result.success) {
        setItems(prev => prev.filter(i => i.id !== item.id))
        toast.success('아이템이 삭제되었습니다.')
      } else {
        toast.error('삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleDeletePackage = async (pkg: Package) => {
    if (!confirm(`\"${pkg.name}\" 패키지를 삭제하시겠습니까?`)) {
      return
    }

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9f6e3f5f/packages/${pkg.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      })

      const result = await response.json()

      if (result.success) {
        setPackages(prev => prev.filter(p => p.id !== pkg.id))
        toast.success('패키지가 삭제되었습니다.')
      } else {
        toast.error('삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Delete package error:', error)
      toast.error('삭제 중 오류가 발생했습니다.')
    }
  }

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
          <h1 className="text-3xl font-bold">아이템 관리</h1>
          <div className="flex gap-4">
            <Button onClick={openAddDialog} className="bg-green-600 hover:bg-green-700">
              <Plus className="mr-2 h-4 w-4" />
              아이템 추가
            </Button>
            <Button onClick={openAddPackageDialog} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              패키지 추가
            </Button>
            <Button onClick={onBack} variant="outline">
              뒤로가기
            </Button>
          </div>
        </div>

        {/* 통계 카드 */}



        {/* 패키지 목록 테이블 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>패키지 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>패키지명</TableHead>
                    <TableHead>설명</TableHead>
                    <TableHead>아이템 수</TableHead>
                    <TableHead>등록일</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-medium">{pkg.name}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {pkg.description}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {items.filter(item => {
                          // package가 배열인지 문자열인지 확인하여 처리
                          if (Array.isArray(item.package)) {
                            return item.package.includes(pkg.name)
                          } else {
                            return item.package === pkg.name
                          }
                        }).length}개
                      </TableCell>
                      <TableCell>
                        {new Date(pkg.createdAt).toLocaleDateString('ko-KR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditPackageDialog(pkg)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeletePackage(pkg)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {packages.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                등록된 패키지가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>

        {/* 아이템 목록 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle>아이템 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>제품명</TableHead>
                    <TableHead>패키지</TableHead>
                    <TableHead>가격</TableHead>
                    <TableHead>설명</TableHead>
                    <TableHead>이미지</TableHead>
                    <TableHead>등록일</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(item.package) ? (
                            item.package.map((pkg, index) => (
                              <Badge key={index} variant="outline">{pkg}</Badge>
                            ))
                          ) : (
                            <Badge variant="outline">{item.package}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {item.price.toLocaleString()}원
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {item.description}
                      </TableCell>
                      <TableCell>
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs">
                            이미지 없음
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                등록된 아이템이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>

        {/* 패키지 추가/수정 다이얼로그 */}
        <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingPackage ? '패키지 수정' : '패키지 추가'}
              </DialogTitle>
              <DialogDescription>
                {editingPackage ? '패키지 정보를 수정하세요.' : '새로운 패키지를 추가하세요.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="packageName" className="mb-2.5">패키지 이름 *</Label>
                <Input
                  id="packageName"
                  value={packageFormData.name}
                  onChange={(e) => setPackageFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="패키지 이름을 입력하세요"
                />
              </div>
              <div>
                <Label htmlFor="packageDescription" className="mb-2.5">패키지 설명</Label>
                <Textarea
                  id="packageDescription"
                  value={packageFormData.description}
                  onChange={(e) => setPackageFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="패키지 설명을 입력하세요"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setIsPackageDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSavePackage}>
                {editingPackage ? '수정' : '추가'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 아이템 추가/수정 다이얼로그 */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? '아이템 수정' : '아이템 추가'}
              </DialogTitle>
              <DialogDescription>
                {editingItem ? '아이템 정보를 수정하세요.' : '새로운 아이템을 추가하세요.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="mb-2.5">제품명 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="제품명을 입력하세요"
                  />
                </div>
                <div>
                  <Label htmlFor="price" className="mb-2.5">가격 *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                    placeholder="가격을 입력하세요"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-3">패키지 분류 * (복수 선택 가능)</Label>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {packages.map(pkg => {
                      const isSelected = formData.package.includes(pkg.name)
                      return (
                        <Button
                          key={pkg.id}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            if (isSelected) {
                              setFormData(prev => ({ 
                                ...prev, 
                                package: prev.package.filter(p => p !== pkg.name) 
                              }))
                            } else {
                              setFormData(prev => ({ 
                                ...prev, 
                                package: [...prev.package, pkg.name] 
                              }))
                            }
                          }}
                          className={`
                            rounded-full px-4 py-2 text-sm font-medium transition-all duration-200
                            ${isSelected 
                              ? 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90' 
                              : 'bg-background border-2 border-border text-foreground hover:bg-accent hover:border-primary/50'
                            }
                          `}
                        >
                          {pkg.name}
                        </Button>
                      )
                    })}
                  </div>
                  
                  {packages.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground">패키지가 없습니다.</p>
                      <p className="text-xs text-muted-foreground mt-1">먼저 패키지를 추가해주세요.</p>
                    </div>
                  )}
                  
                  {formData.package.length > 0 && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-2">
                        선택된 패키지 ({formData.package.length}개)
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {formData.package.map(pkg => (
                          <Badge 
                            key={pkg} 
                            variant="secondary" 
                            className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border-primary/20"
                          >
                            {pkg}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="imageUrl" className="mb-2.5">제품 이미지 URL</Label>
                <Input
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="이미지 URL을 입력하세요"
                />
              </div>

              <div>
                <Label htmlFor="description" className="mb-2.5">제품 설명</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="제품 설명을 입력하세요"
                  rows={3}
                />
              </div>

              {formData.imageUrl && (
                <div>
                  <Label className="mb-2.5">이미지 미리보기</Label>
                  <img 
                    src={formData.imageUrl} 
                    alt="미리보기"
                    className="w-full h-48 object-cover rounded border"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSave}>
                {editingItem ? '수정' : '저장'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}