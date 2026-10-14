/**
 * StartScreen 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

// Supabase mock (factory 함수로 작성)
vi.mock('../lib/supabase', () => {
  const mockSignInAnonymously = vi.fn()
  const mockInvoke = vi.fn()

  return {
    supabase: {
      auth: {
        signInAnonymously: mockSignInAnonymously,
      },
      functions: {
        invoke: mockInvoke,
      },
    },
    // 테스트에서 접근할 수 있도록 export
    _mockSignInAnonymously: mockSignInAnonymously,
    _mockInvoke: mockInvoke,
  }
})

// useNavigate mock
vi.mock('react-router-dom', async () => {
  const actual: any = await vi.importActual('react-router-dom')
  const mockNavigate = vi.fn()

  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams()],
    _mockNavigate: mockNavigate,
  }
})

import StartScreen from './StartScreen'
import { supabase } from '../lib/supabase'
import * as router from 'react-router-dom'

// Mock 함수 참조
const mockSignInAnonymously = (supabase.auth as any).signInAnonymously
const mockInvoke = (supabase.functions as any).invoke
const mockNavigate = (router as any)._mockNavigate

describe('StartScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('체험 시작하기 버튼이 렌더링됨', () => {
    render(
      <BrowserRouter>
        <StartScreen />
      </BrowserRouter>
    )

    expect(screen.getByText('체험 시작하기')).toBeDefined()
    expect(screen.getByText('온곁')).toBeDefined()
  })

  it('버튼 클릭 시 익명 로그인 → trial-seed 호출 → 홈 이동', async () => {
    // Mock 응답 설정
    mockSignInAnonymously.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })
    mockInvoke.mockResolvedValue({
      data: { ok: true },
      error: null,
    })

    render(
      <BrowserRouter>
        <StartScreen />
      </BrowserRouter>
    )

    const button = screen.getByText('체험 시작하기')
    fireEvent.click(button)

    // 로딩 상태 확인
    await waitFor(() => {
      expect(screen.getByText('준비 중...')).toBeDefined()
    })

    // 익명 로그인 호출 확인
    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1)

    // trial-seed 호출 확인
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('trial-seed')
    })

    // 홈으로 이동 확인
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true })
    })
  })

  it('익명 로그인 실패 시 오류 메시지 표시', async () => {
    mockSignInAnonymously.mockResolvedValue({
      data: { user: null },
      error: { message: '로그인 실패' },
    })

    render(
      <BrowserRouter>
        <StartScreen />
      </BrowserRouter>
    )

    const button = screen.getByText('체험 시작하기')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText(/익명 로그인 실패/)).toBeDefined()
    })

    // 홈으로 이동하지 않음
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
