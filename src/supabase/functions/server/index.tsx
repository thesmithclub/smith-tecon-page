import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'npm:@supabase/supabase-js'
import * as kv from './kv_store.tsx'

const app = new Hono()

app.use('*', cors({
  origin: '*',
  allowHeaders: ['*'],
  allowMethods: ['*'],
}))

app.use('*', logger(console.log))

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// 예약 신청 생성
app.post('/make-server-9f6e3f5f/bookings', async (c) => {
  try {
    const body = await c.req.json()
    
    // 사용자가 입력한 예약번호 사용
    const bookingNumber = body.bookingNumber
    
    // 중복 예약번호 체크
    const existingBooking = await kv.get(`booking:${bookingNumber}`)
    if (existingBooking) {
      return c.json({ error: '이미 사용 중인 예약번호입니다.' }, 400)
    }
    
    const booking = {
      bookingNumber,
      carModel: body.carModel,
      name: body.name,
      phone: body.phone,
      location: body.location,
      visitDate: body.visitDate,
      visitTime: body.visitTime,
      message: body.message,
      status: '신청',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    await kv.set(`booking:${bookingNumber}`, booking)
    await kv.set(`booking_by_phone:${body.phone}`, bookingNumber)
    
    return c.json({ success: true, bookingNumber })
  } catch (error) {
    console.log('Error creating booking:', error)
    return c.json({ error: 'Failed to create booking' }, 500)
  }
})

// 예약 상태 조회
app.post('/make-server-9f6e3f5f/bookings/status', async (c) => {
  try {
    const body = await c.req.json()
    const { name, phone } = body
    
    const bookingNumber = await kv.get(`booking_by_phone:${phone}`)
    if (!bookingNumber) {
      return c.json({ error: '해당 정보로 등록된 예약이 없습니다.' }, 404)
    }
    
    const booking = await kv.get(`booking:${bookingNumber}`)
    if (!booking || booking.name !== name) {
      return c.json({ error: '이름과 전화번호가 일치하지 않습니다.' }, 404)
    }
    
    return c.json({ success: true, booking })
  } catch (error) {
    console.log('Error fetching booking status:', error)
    return c.json({ error: 'Failed to fetch booking status' }, 500)
  }
})

// 관리자: 모든 예약 조회
app.get('/make-server-9f6e3f5f/admin/bookings', async (c) => {
  try {
    const bookings = await kv.getByPrefix('booking:')
    return c.json({ success: true, bookings })
  } catch (error) {
    console.log('Error fetching admin bookings:', error)
    return c.json({ error: 'Failed to fetch bookings' }, 500)
  }
})

// 관리자: 예약 상태 업데이트
app.put('/make-server-9f6e3f5f/admin/bookings/:id', async (c) => {
  try {
    const bookingNumber = c.req.param('id')
    const body = await c.req.json()
    
    const booking = await kv.get(`booking:${bookingNumber}`)
    if (!booking) {
      return c.json({ error: 'Booking not found' }, 404)
    }
    
    const updatedBooking = {
      ...booking,
      ...body,
      updatedAt: new Date().toISOString()
    }
    
    await kv.set(`booking:${bookingNumber}`, updatedBooking)
    
    return c.json({ success: true, booking: updatedBooking })
  } catch (error) {
    console.log('Error updating booking:', error)
    return c.json({ error: 'Failed to update booking' }, 500)
  }
})

// 관리자: 예약 완전 삭제
app.delete('/make-server-9f6e3f5f/admin/bookings/:id', async (c) => {
  try {
    const bookingNumber = c.req.param('id')
    await kv.del(`booking:${bookingNumber}`)
    return c.json({ success: true })
  } catch (error) {
    console.log('Error deleting booking:', error)
    return c.json({ error: 'Failed to delete booking' }, 500)
  }
})

// 컨설팅 정보 저장
app.post('/make-server-9f6e3f5f/admin/consulting', async (c) => {
  try {
    const body = await c.req.json()
    
    const consulting = {
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    await kv.set(`consulting:${body.bookingNumber}`, consulting)
    
    // 예약 상태도 업데이트 (차량입고일자 정보도 함께 저장)
    const booking = await kv.get(`booking:${body.bookingNumber}`)
    if (booking) {
      booking.status = '상담완료'
      booking.carArrivalDate = body.carInDate // 차량입고일자 추가
      booking.updatedAt = new Date().toISOString()
      await kv.set(`booking:${body.bookingNumber}`, booking)
    }
    
    return c.json({ success: true, consulting })
  } catch (error) {
    console.log('Error saving consulting:', error)
    return c.json({ error: 'Failed to save consulting' }, 500)
  }
})

// 컨설팅 정보 조회
app.get('/make-server-9f6e3f5f/admin/consulting/:bookingNumber', async (c) => {
  try {
    const bookingNumber = c.req.param('bookingNumber')
    const consulting = await kv.get(`consulting:${bookingNumber}`)
    
    return c.json({ success: true, consulting })
  } catch (error) {
    console.log('Error fetching consulting:', error)
    return c.json({ error: 'Failed to fetch consulting' }, 500)
  }
})

// 모든 컨설팅 정보 조회
app.get('/make-server-9f6e3f5f/admin/consultings', async (c) => {
  try {
    const consultings = await kv.getByPrefix('consulting:')
    return c.json({ success: true, consultings })
  } catch (error) {
    console.log('Error fetching consultings:', error)
    return c.json({ error: 'Failed to fetch consultings' }, 500)
  }
})

// 아이템 조회
app.get('/make-server-9f6e3f5f/items', async (c) => {
  try {
    const items = await kv.getByPrefix('item:')
    console.log(`Fetched ${items.length} items from database`)
    return c.json({ success: true, items })
  } catch (error) {
    console.log('Error fetching items:', error)
    return c.json({ error: 'Failed to fetch items' }, 500)
  }
})

// 아이템 생성
app.post('/make-server-9f6e3f5f/items', async (c) => {
  try {
    const body = await c.req.json()
    const itemId = `item_${Date.now()}`
    
    const item = {
      id: itemId,
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    await kv.set(`item:${itemId}`, item)
    
    return c.json({ success: true, item })
  } catch (error) {
    console.log('Error creating item:', error)
    return c.json({ error: 'Failed to create item' }, 500)
  }
})

// 아이템 수정
app.put('/make-server-9f6e3f5f/items/:id', async (c) => {
  try {
    const itemId = c.req.param('id')
    const body = await c.req.json()
    
    console.log('Updating item:', itemId)
    console.log('Update data:', body)
    console.log('Image URL in body:', body.imageUrl)
    
    const existingItem = await kv.get(`item:${itemId}`)
    if (!existingItem) {
      console.log('Item not found:', itemId)
      return c.json({ error: 'Item not found' }, 404)
    }
    
    console.log('Existing item:', existingItem)
    console.log('Existing image URL:', existingItem.imageUrl)
    
    const updatedItem = {
      ...existingItem,
      ...body,
      updatedAt: new Date().toISOString()
    }
    
    console.log('Updated item data:', updatedItem)
    console.log('Final image URL:', updatedItem.imageUrl)
    
    await kv.set(`item:${itemId}`, updatedItem)
    
    console.log('Item saved successfully')
    
    return c.json({ success: true, item: updatedItem })
  } catch (error) {
    console.log('Error updating item:', error)
    return c.json({ error: 'Failed to update item' }, 500)
  }
})

// 아이템 삭제
app.delete('/make-server-9f6e3f5f/items/:id', async (c) => {
  try {
    const itemId = c.req.param('id')
    await kv.del(`item:${itemId}`)
    
    return c.json({ success: true })
  } catch (error) {
    console.log('Error deleting item:', error)
    return c.json({ error: 'Failed to delete item' }, 500)
  }
})

// 패키지 조회
app.get('/make-server-9f6e3f5f/packages', async (c) => {
  try {
    const packages = await kv.getByPrefix('package:')
    return c.json({ success: true, packages })
  } catch (error) {
    console.log('Error fetching packages:', error)
    return c.json({ error: 'Failed to fetch packages' }, 500)
  }
})

// 패키지 생성
app.post('/make-server-9f6e3f5f/packages', async (c) => {
  try {
    const body = await c.req.json()
    const packageId = `package_${Date.now()}`
    
    const packageItem = {
      id: packageId,
      name: body.name,
      description: body.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    await kv.set(`package:${packageId}`, packageItem)
    
    return c.json({ success: true, package: packageItem })
  } catch (error) {
    console.log('Error creating package:', error)
    return c.json({ error: 'Failed to create package' }, 500)
  }
})

// 패키지 수정
app.put('/make-server-9f6e3f5f/packages/:id', async (c) => {
  try {
    const packageId = c.req.param('id')
    const body = await c.req.json()
    
    const existingPackage = await kv.get(`package:${packageId}`)
    if (!existingPackage) {
      return c.json({ error: 'Package not found' }, 404)
    }
    
    const updatedPackage = {
      ...existingPackage,
      name: body.name,
      description: body.description || '',
      updatedAt: new Date().toISOString()
    }
    
    await kv.set(`package:${packageId}`, updatedPackage)
    
    return c.json({ success: true, package: updatedPackage })
  } catch (error) {
    console.log('Error updating package:', error)
    return c.json({ error: 'Failed to update package' }, 500)
  }
})

// 패키지 삭제
app.delete('/make-server-9f6e3f5f/packages/:id', async (c) => {
  try {
    const packageId = c.req.param('id')
    await kv.del(`package:${packageId}`)
    
    return c.json({ success: true })
  } catch (error) {
    console.log('Error deleting package:', error)
    return c.json({ error: 'Failed to delete package' }, 500)
  }
})

// 기본 아이템 데이터 초기화 (처음 실행시)
app.post('/make-server-9f6e3f5f/init-data', async (c) => {
  try {
    console.log('Starting data initialization...')
    
    // 이미 초기화되었는지 확인 (패키지와 아이템 모두 체크)
    const existingPackages = await kv.getByPrefix('package:')
    const existingItems = await kv.getByPrefix('item:')
    
    if (existingPackages.length > 0 && existingItems.length > 0) {
      console.log(`Data already initialized - ${existingPackages.length} packages, ${existingItems.length} items`)
      return c.json({ success: true, message: 'Data already initialized', 
        counts: { packages: existingPackages.length, items: existingItems.length } })
    }
    
    console.log('Initializing default data...')

    // 기본 패키지 초기화 - 병렬 처리
    const defaultPackages = [
      {
        id: 'package_family',
        name: '패밀리',
        description: '가족을 위한 편의 패키지'
      },
      {
        id: 'package_camping',
        name: '캠핑',
        description: '캠핑 및 아웃도어 패키지'
      },
      {
        id: 'package_convenience',
        name: '컨비니언스',
        description: '편의성 향상 패키지'
      },
      {
        id: 'package_space',
        name: '스페이스',
        description: '공간 활용 최적화 패키지'
      }
    ]
    
    const packagePromises = defaultPackages.map(pkg => 
      kv.set(`package:${pkg.id}`, {
        ...pkg,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    )
    
    await Promise.all(packagePromises)
    console.log('Packages initialized')

    const defaultItems = [
      {
        id: 'item_family_1',
        name: '패밀리 시트 커버',
        package: '패밀리',
        imageUrl: 'https://example.com/seat-cover.jpg',
        description: '가족 친화적인 프리미엄 시트 커버',
        price: 150000
      },
      {
        id: 'item_camping_1',
        name: '캠핑 매트',
        package: '캠핑',
        imageUrl: 'https://example.com/camping-mat.jpg',
        description: '차량용 캠핑 매트',
        price: 200000
      },
      {
        id: 'item_convenience_1',
        name: '무선 충전패드',
        package: '컨비니언스',
        imageUrl: 'https://example.com/wireless-charger.jpg',
        description: '고속 무선 충전패드',
        price: 80000
      },
      {
        id: 'item_space_1',
        name: '트렁크 정리함',
        package: '스페이스',
        imageUrl: 'https://example.com/trunk-organizer.jpg',
        description: '대용량 트렁크 정리함',
        price: 120000
      }
    ]
    
    const itemPromises = defaultItems.map(item => 
      kv.set(`item:${item.id}`, {
        ...item,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    )
    
    await Promise.all(itemPromises)
    console.log('Items initialized')
    
    return c.json({ success: true, message: 'Default packages and items initialized' })
  } catch (error) {
    console.log('Error initializing data:', error)
    return c.json({ error: 'Failed to initialize data' }, 500)
  }
})

Deno.serve(app.fetch)