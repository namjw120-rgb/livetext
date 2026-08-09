import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // 운영자 페이지로 리다이렉트
    router.replace('/operator')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <p className="text-white text-lg">LIVE TEXT 로딩 중...</p>
    </div>
  )
}
