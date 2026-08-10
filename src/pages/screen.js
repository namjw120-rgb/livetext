import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

const MAX_DISPLAY = 9
const CYCLE_INTERVAL = 15000

const BUBBLE_TYPES = ['filled', 'light', 'soft']

const BUBBLE_STYLES = {
  filled: {
    background: '#2d7a3a',
    border: 'none',
    nameColor: 'rgba(167,243,208,0.85)',
    textColor: '#ffffff',
  },
  light: {
    background: 'rgba(255,255,255,0.9)',
    border: '1px solid rgba(45,122,58,0.30)',
    nameColor: '#7db882',
    textColor: '#2d4a30',
  },
  soft: {
    background: 'rgba(45,122,58,0.14)',
    border: '1px solid rgba(45,122,58,0.22)',
    nameColor: '#5a9e65',
    textColor: '#1e3a22',
  },
}

function getFontSize(len) {
  if (len <= 15)  return '2.4rem'
  if (len <= 30)  return '2rem'
  if (len <= 55)  return '1.6rem'
  if (len <= 80)  return '1.3rem'
  if (len <= 110) return '1.05rem'
  return '0.9rem'
}

// 짧은 메시지 → 완전 pill / 긴 메시지 → 둥근 사각형 (텍스트 삐져나옴 방지)
function getBorderRadius(len) {
  if (len <= 18) return '999px'
  if (len <= 45) return '36px'
  return '24px'
}

// 버블 크기 실측 후 겹치지 않게 그리디 배치
function greedyPlace(wrapEl, screenEl) {
  const sw = screenEl.offsetWidth
  const sh = screenEl.offsetHeight
  const HEADER = 56   // 헤더 높이 여백
  const MARGIN = 20   // 화면 가장자리 여백
  const GAP    = 14   // 버블 간 최소 간격
  const TRIES  = 300  // 위치 후보 시도 횟수

  const bubbles = Array.from(wrapEl.querySelectorAll('.bubble-item'))
  if (!bubbles.length) return

  // 실제 렌더된 크기 측정
  const items = bubbles.map(el => ({
    el,
    w: el.offsetWidth,
    h: el.offsetHeight,
  }))

  // 큰 버블 먼저 배치 (작은 버블이 틈새를 채움)
  const sorted = [...items].sort((a, b) => (b.w * b.h) - (a.w * a.h))
  const placed = []

  for (const item of sorted) {
    const maxX = sw - item.w - MARGIN
    const maxY = sh - item.h - MARGIN
    if (maxX < MARGIN || maxY < HEADER) continue

    let bestX = null, bestY = null, bestScore = Infinity

    for (let t = 0; t < TRIES; t++) {
      const x = MARGIN + Math.random() * (maxX - MARGIN)
      const y = HEADER  + Math.random() * (maxY - HEADER)

      // 기존 버블과 겹치는지 확인
      const overlaps = placed.some(p =>
        !(x + item.w + GAP <= p.x || p.x + p.w + GAP <= x ||
          y + item.h + GAP <= p.y || p.y + p.h + GAP <= y)
      )
      if (overlaps) continue

      // 골고루 퍼지도록 분산 점수 계산 (기존 버블들과 거리 합이 클수록 좋음)
      let score = 0
      if (placed.length > 0) {
        const cx = x + item.w / 2
        const cy = y + item.h / 2
        score = -placed.reduce((s, p) =>
          s + Math.sqrt((cx - p.x - p.w / 2) ** 2 + (cy - p.y - p.h / 2) ** 2), 0)
      }

      if (score < bestScore) {
        bestScore = score
        bestX = x
        bestY = y
      }
    }

    if (bestX !== null) {
      item.el.style.left    = bestX + 'px'
      item.el.style.top     = bestY + 'px'
      item.el.style.opacity = '1'
      placed.push({ x: bestX, y: bestY, w: item.w, h: item.h })
    }
    // 자리를 못 찾은 버블은 숨김 유지
  }
}

export default function Screen() {
  const router = useRouter()
  const { event } = router.query

  const [allMessages, setAllMessages] = useState([])
  const [windowStart, setWindowStart] = useState(0)
  const cycleTimerRef = useRef(null)
  const wrapRef       = useRef(null)
  const screenRef     = useRef(null)

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

  // 실시간 — 새 승인 메시지 반영
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

  // 원형 순환 타이머 — 메시지가 MAX_DISPLAY 초과 시 15초마다 한 칸 전진
  useEffect(() => {
    clearInterval(cycleTimerRef.current)
    if (allMessages.length <= MAX_DISPLAY) return
    cycleTimerRef.current = setInterval(() => {
      setWindowStart(prev => (prev + 1) % allMessages.length)
    }, CYCLE_INTERVAL)
    return () => clearInterval(cycleTimerRef.current)
  }, [allMessages.length])

  // 슬라이딩 윈도우 — 화면에 표시할 메시지 목록
  const displayMessages = useMemo(() => {
    if (!allMessages.length) return []
    const count = Math.min(MAX_DISPLAY, allMessages.length)
    return Array.from({ length: count }, (_, i) =>
      allMessages[(windowStart + i) % allMessages.length]
    )
  }, [allMessages, windowStart])

  // displayMessages 바뀔 때마다 버블 재배치
  useEffect(() => {
    if (!displayMessages.length || !wrapRef.current || !screenRef.current) return
    // 두 번의 requestAnimationFrame으로 DOM 렌더 완료 대기 후 실측 배치
    const f1 = requestAnimationFrame(() => {
      const f2 = requestAnimationFrame(() => {
        greedyPlace(wrapRef.current, screenRef.current)
      })
      return () => cancelAnimationFrame(f2)
    })
    return () => cancelAnimationFrame(f1)
  }, [displayMessages])

  return (
    <>
      <Head>
        <title>EUNSUNG CHURCH - 스크린</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div
        ref={screenRef}
        style={{
          position: 'fixed',
          inset: 0,
          background: '#e8f5e3',
          overflow: 'hidden',
          fontFamily: "'Noto Sans KR', sans-serif",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 32px 0',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <p style={{ color: '#2d7a3a', fontSize: '0.9rem', fontWeight: 900, letterSpacing: '2.5px', margin: 0 }}>
            EUNSUNG CHURCH
          </p>
          {event && (
            <p style={{ color: '#9ecba3', fontSize: '0.72rem', fontFamily: 'monospace', margin: 0 }}>
              #{event}
            </p>
          )}
        </div>

        {/* 버블 영역 */}
        <div ref={wrapRef} style={{ position: 'absolute', inset: 0 }}>
          {displayMessages.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <p style={{ color: '#8ec294', fontSize: '1.2rem', fontWeight: 400, letterSpacing: '3px', margin: 0 }}>
                메시지를 기다리는 중
              </p>
            </div>
          ) : (
            displayMessages.map((msg, i) => {
              const type  = BUBBLE_TYPES[i % 3]
              const style = BUBBLE_STYLES[type]
              return (
                <div
                  key={`${msg.id}-${windowStart}`}
                  className="bubble-item"
                  style={{
                    position: 'absolute',
                    left: '-9999px',
                    top: '-9999px',
                    opacity: 0,
                    transition: 'opacity 0.45s ease',
                    borderRadius: getBorderRadius(msg.content.length),
                    padding: '12px 26px 14px',
                    maxWidth: '28%',
                    overflow: 'hidden',
                    background: style.background,
                    border: style.border || 'none',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      marginBottom: '5px',
                      color: style.nameColor,
                    }}
                  >
                    {msg.nickname}
                  </span>
                  <p
                    style={{
                      margin: 0,
                      fontSize: getFontSize(msg.content.length),
                      fontWeight: 700,
                      lineHeight: 1.45,
                      wordBreak: 'keep-all',
                      color: style.textColor,
                    }}
                  >
                    {msg.content}
                  </p>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
