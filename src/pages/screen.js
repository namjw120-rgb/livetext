import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

const MAX_DISPLAY = 10
const CYCLE_INTERVAL = 4000 // 4초마다 한 칸 전진

export default function Screen() {
  const router = useRouter()
  const { event } = router.query

  // 승인된 전체 메시지 풀 (절대 줄어들지 않음 — 원형 순환)
  const [allMessages, setAllMessages] = useState([])
  // 현재 윈도우 시작 인덱스
  const [windowStart, setWindowStart] = useState(0)
  const cycleTimerRef = useRef(null)

  // 초기 로드
  useEffect(() => {
    if (!event) return
    const load = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('event_id', event)
        .eq('status', 'approved')
        .order('approved_at', { ascending: true })
      if (data) setAllMessages(data)
    }
    load()
  }, [event])

  // 실시간 — 새 승인 메시지 풀에 추가
  useEffect(() => {
    if (!event) return
    const channel = supabase
      .channel(`screen-${event}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `event_id=eq.${event}` },
        async () => {
          const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('event_id', event)
            .eq('status', 'approved')
            .order('approved_at', { ascending: true })
          if (data) setAllMessages(data)
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [event])

  // 원형 순환 타이머
  // 풀이 MAX_DISPLAY보다 많을 때만 전진
  useEffect(() => {
    clearInterval(cycleTimerRef.current)
    if (allMessages.length <= MAX_DISPLAY) return

    cycleTimerRef.current = setInterval(() => {
      setWindowStart(prev => (prev + 1) % allMessages.length)
    }, CYCLE_INTERVAL)

    return () => clearInterval(cycleTimerRef.current)
  }, [allMessages.length])

  // 현재 화면에 표시할 메시지 — 원형 슬라이싱
  // windowStart부터 최대 10개, 끝에서 처음으로 wrap
  const displayMessages = useMemo(() => {
    if (allMessages.length === 0) return []
    const count = Math.min(MAX_DISPLAY, allMessages.length)
    return Array.from({ length: count }, (_, i) =>
      allMessages[(windowStart + i) % allMessages.length]
    )
  }, [allMessages, windowStart])

  const getFontSize = (content) => {
    if (content.length > 60) return '1.1rem'
    if (content.length > 30) return '1.3rem'
    return '1.6rem'
  }

  // 그리드 컬럼 수
  const gridCols = () => {
    const n = displayMessages.length
    if (n <= 2) return 1
    if (n <= 4) return 2
    if (n <= 6) return 3
    return 4
  }

  return (
    <>
      <Head>
        <title>LIVE TEXT - 스크린</title>
      </Head>

      <div
        className="min-h-screen bg-black relative overflow-hidden"
        style={{ fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" }}
      >
        <div className="absolute top-6 left-8 z-10">
          <p className="text-gray-800 text-xs font-medium tracking-widest uppercase">Live Text</p>
        </div>
        {event && (
          <div className="absolute top-6 right-8 z-10">
            <p className="text-gray-800 text-xs font-mono">#{event}</p>
          </div>
        )}

        <div className="min-h-screen p-10 pt-16 flex items-center">
          {displayMessages.length === 0 ? (
            <div className="w-full text-center">
              <p className="text-gray-800 text-xl font-light tracking-widest">메시지를 기다리는 중</p>
              <div className="flex justify-center gap-2 mt-5">
                {[0, 150, 300].map(delay => (
                  <span
                    key={delay}
                    className="w-2 h-2 bg-gray-800 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div
              className="w-full"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${gridCols()}, 1fr)`,
                gap: '14px',
              }}
            >
              {displayMessages.map((msg) => (
                // key = msg.id + windowStart 조합 → 같은 메시지도 위치 바뀌면 애니메이션
                <div
                  key={`${msg.id}-${windowStart}`}
                  className="animate-slide-up"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px',
                    padding: '20px 22px',
                  }}
                >
                  <p
                    style={{
                      color: 'rgba(255,255,255,0.3)',
                      fontSize: '0.72rem',
                      margin: '0 0 8px',
                      fontWeight: 500,
                      letterSpacing: '0.5px',
                    }}
                  >
                    {msg.nickname}
                  </p>
                  <p
                    style={{
                      color: '#fff',
                      fontSize: getFontSize(msg.content),
                      fontWeight: 700,
                      lineHeight: 1.35,
                      margin: 0,
                      wordBreak: 'keep-all',
                    }}
                  >
                    {msg.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
