import { describe, it, expect } from 'vitest';
import { version } from './index';

describe('shared 모듈', () => {
  it('버전 정보를 반환한다', () => {
    expect(version).toBe('0.6.0');
  });
});
