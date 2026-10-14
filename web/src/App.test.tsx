import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('앱 제목을 렌더링한다', () => {
    render(<App />);
    expect(screen.getByText('온곁 리멤버')).toBeInTheDocument();
  });

  it('앱 설명을 렌더링한다', () => {
    render(<App />);
    expect(screen.getByText('반려동물을 떠나보낸 보호자를 위한 AI 케어')).toBeInTheDocument();
  });
});
