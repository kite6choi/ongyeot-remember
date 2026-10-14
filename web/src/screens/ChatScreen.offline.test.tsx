/**
 * 대화 화면 오프라인 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ChatScreen from './ChatScreen'

// scrollIntoView mock
Element.prototype.scrollIntoView = vi.fn()

// Supabase mock
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: { id: 'user-1' } }, error: null })
      ),
      getSession: vi.fn(() =>
        Promise.resolve({
          data: { session: { access_token: 'token' } },
          error: null,
        })
      ),
    },
    from: vi.fn((table: string) => {
      if (table === 'pets') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({ data: { id: 'pet-1' }, error: null })
                ),
              })),
            })),
          })),
        }
      } else if (table === 'conversations') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn(() => ({
                  single: vi.fn(() =>
                    Promise.resolve({ data: { id: 'conv-1' }, error: null })
                  ),
                })),
              })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({ data: { id: 'conv-1' }, error: null })
              ),
            })),
          })),
        }
      }
      return {}
    }),
  },
}))

describe('ChatScreen - 오프라인', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('오프라인 상태에서 안내 문구를 표시한다', () => {
    // navigator.onLine을 false로 설정
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })

    render(
      <BrowserRouter>
        <ChatScreen />
      </BrowserRouter>
    )

    // 오프라인 안내 문구 확인
    expect(
      screen.getByText(/현재 오프라인 상태입니다/)
    ).toBeInTheDocument()
  })

  it('오프라인 상태에서 입력창이 비활성화된다', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })

    render(
      <BrowserRouter>
        <ChatScreen />
      </BrowserRouter>
    )

    const textarea = screen.getByPlaceholderText(/오프라인 상태입니다/)
    const button = screen.getByRole('button', { name: /전송/ })

    expect(textarea).toBeDisabled()
    expect(button).toBeDisabled()
  })

  it('온라인 상태에서는 오프라인 안내가 표시되지 않는다', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })

    render(
      <BrowserRouter>
        <ChatScreen />
      </BrowserRouter>
    )

    expect(
      screen.queryByText(/현재 오프라인 상태입니다/)
    ).not.toBeInTheDocument()
  })

  it('온라인→오프라인 전환 시 안내가 표시된다', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })

    render(
      <BrowserRouter>
        <ChatScreen />
      </BrowserRouter>
    )

    // 처음엔 안내 없음
    expect(
      screen.queryByText(/현재 오프라인 상태입니다/)
    ).not.toBeInTheDocument()

    // 오프라인으로 전환
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })
    fireEvent(window, new Event('offline'))

    // 안내 표시됨
    expect(
      screen.getByText(/현재 오프라인 상태입니다/)
    ).toBeInTheDocument()
  })

  it('오프라인→온라인 전환 시 안내가 사라진다', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })

    render(
      <BrowserRouter>
        <ChatScreen />
      </BrowserRouter>
    )

    // 처음엔 안내 표시
    expect(
      screen.getByText(/현재 오프라인 상태입니다/)
    ).toBeInTheDocument()

    // 온라인으로 전환
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })
    fireEvent(window, new Event('online'))

    // 안내 사라짐
    expect(
      screen.queryByText(/현재 오프라인 상태입니다/)
    ).not.toBeInTheDocument()
  })
})
