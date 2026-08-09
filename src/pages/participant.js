import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

export default function Participant() {
  const router = useRouter()
  const { event } = router.query

  const [nickname, setNickname] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const MAX_CHARS = 100

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim()) return
    if (!event) {
      setError('잘못된 접근입니다. QR 코드를 다시 스캔해 주세요.')
      return
    }

    setSubmitting(true)
    setError('')

    const { error: dbError } = await supabase.from('messages').insert({
      event_id: event,
      content: content.trim(),
      nickname: nickname.trim() || '익명',
      status: 'pending',
    })

    if (dbError) {
      setError('전송에 실패했습니다. 다시 시도해 주세요.')
      setSubmitting(false)
      return
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  const handleSendAnother = () => {
    setContent('')
    setNickname('')
    setSubmitted(false)
  }

  if (!event && typeof window !== 'undefined') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-400 text-lg">유효하지 않은 접근입니다.</p>
          <p className="text-gray-500 mt-2 text-sm">QR 코드를 다시 스캔해 주세요.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>LIVE TEXT - 메시지 보내기</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-950 flex flex-col">
        {/* 헤더 */}
        <div className="px-5 pt-10 pb-6">
          <h1 className="text-white text-2xl font-bold tracking-tight">LIVE TEXT</h1>
          <p className="text-gray-400 text-sm mt-1">현장 스크린에 메시지를 보내세요</p>
        </div>

        {/* 메인 */}
        <div className="flex-1 px-5">
          {submitted ? (
            <div className="animate-slide-up flex flex-col items-center justify-center pt-16">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-5">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-white text-xl font-semibold">메시지가 전송되었습니다!</h2>
              <p className="text-gray-400 text-sm mt-2 text-center">운영자 확인 후 스크린에 표시됩니다</p>
              <button
                onClick={handleSendAnother}
                className="mt-8 px-6 py-3 bg-gray-800 text-white rounded-xl text-sm hover:bg-gray-700 transition-colors"
              >
                다른 메시지 보내기
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* 닉네임 */}
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-2 uppercase tracking-wider">
                  이름 (선택)
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="익명"
                  maxLength={20}
                  className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 text-base border border-gray-800 focus:border-white focus:outline-none placeholder-gray-600 transition-colors"
                />
              </div>

              {/* 메시지 */}
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-2 uppercase tracking-wider">
                  메시지
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
                  placeholder="스크린에 표시될 메시지를 입력하세요"
                  rows={4}
                  className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 text-base border border-gray-800 focus:border-white focus:outline-none placeholder-gray-600 transition-colors resize-none"
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-xs ${content.length >= MAX_CHARS ? 'text-red-400' : 'text-gray-600'}`}>
                    {content.length}/{MAX_CHARS}
                  </span>
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={!content.trim() || submitting}
                className="w-full py-4 bg-white text-gray-900 font-semibold rounded-xl text-base disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                {submitting ? '전송 중...' : '메시지 보내기'}
              </button>
            </form>
          )}
        </div>

        {/* 하단 */}
        <div className="px-5 py-6 text-center">
          <p className="text-gray-700 text-xs">운영자가 확인한 메시지만 스크린에 표시됩니다</p>
        </div>
      </div>
    </>
  )
}
