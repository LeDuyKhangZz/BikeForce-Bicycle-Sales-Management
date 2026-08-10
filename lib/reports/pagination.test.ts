/**
 * Unit test cho `lib/reports/pagination.ts` — PHASE 7.
 *
 * Trọng tâm là **biên**: lệch `±1` ở `.range()` không ném lỗi, nó chỉ lặng lẽ
 * làm mất hoặc lặp một dòng ở chỗ giao hai trang. Và mọi đầu vào ở đây đến từ
 * URL, nên phải chịu được chuỗi rác mà không sinh `NaN` hay số âm.
 */
import { describe, expect, it } from 'vitest';

import {
  buildPageInfo,
  pageRange,
  parsePageParam,
  REPORTS_PAGE_SIZE,
} from './pagination';

describe('REPORTS_PAGE_SIZE', () => {
  it('là 20 theo docs/07 §5', () => {
    expect(REPORTS_PAGE_SIZE).toBe(20);
  });
});

describe('parsePageParam — ?page= đến từ URL nên là chuỗi bất kỳ', () => {
  it.each([
    ['trang hợp lệ', '1', 1],
    ['trang giữa', '7', 7],
    ['có khoảng trắng thừa', ' 3 ', 3],
    ['thiếu tham số', undefined, 1],
    ['chuỗi rỗng', '', 1],
    ['chuỗi rác', 'abc', 1],
    ['số 0 không tồn tại vì trang là 1-based', '0', 1],
    ['số âm', '-5', 1],
    ['số thập phân', '2.5', 1],
    ['NaN dạng chuỗi', 'NaN', 1],
    ['Infinity dạng chuỗi', 'Infinity', 1],
    ['vượt Number.MAX_SAFE_INTEGER', '99999999999999999999', 1],
    ['dạng mũ', '1e3', 1000],
  ])('%s', (_label, input, expected) => {
    expect(parsePageParam(input)).toBe(expected);
  });

  it('không bao giờ trả NaN, số âm hay số thập phân', () => {
    for (const raw of ['abc', '-1', '0', '2.5', '', 'NaN', 'Infinity', '-Infinity', undefined]) {
      const page = parsePageParam(raw);
      expect(Number.isSafeInteger(page)).toBe(true);
      expect(page).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('pageRange — chỉ số 0-based inclusive hai đầu cho .range()', () => {
  it.each([
    ['trang 1', 1, 0, 19],
    ['trang 2 bắt đầu ngay sau trang 1', 2, 20, 39],
    ['trang 3', 3, 40, 59],
    ['trang 10', 10, 180, 199],
  ])('%s', (_label, page, from, to) => {
    expect(pageRange(page)).toEqual({ from, to });
  });

  it('mỗi trang lấy đúng REPORTS_PAGE_SIZE dòng', () => {
    for (let page = 1; page <= 25; page += 1) {
      const { from, to } = pageRange(page);
      expect(to - from + 1).toBe(REPORTS_PAGE_SIZE);
    }
  });

  /** Bài quan trọng nhất của file: hai trang liền nhau không chồng, không hở. */
  it('trang kế tiếp bắt đầu ĐÚNG sau trang trước — không hở, không chồng', () => {
    for (let page = 1; page <= 25; page += 1) {
      expect(pageRange(page + 1).from).toBe(pageRange(page).to + 1);
    }
  });

  it('tôn trọng pageSize truyền vào', () => {
    expect(pageRange(1, 5)).toEqual({ from: 0, to: 4 });
    expect(pageRange(3, 5)).toEqual({ from: 10, to: 14 });
  });

  it.each([
    ['trang 0', 0],
    ['trang âm', -3],
    ['trang thập phân', 1.5],
    ['NaN', Number.NaN],
  ])('%s → lùi về trang 1, KHÔNG sinh chỉ số âm', (_label, page) => {
    expect(pageRange(page)).toEqual({ from: 0, to: 19 });
  });
});

describe('buildPageInfo', () => {
  it('tập rỗng vẫn là "trang 1 trên 1", không phải trên 0', () => {
    expect(buildPageInfo(0, 1)).toEqual({
      page: 1,
      pageCount: 1,
      total: 0,
      hasPrev: false,
      hasNext: false,
      rangeStart: 0,
      rangeEnd: 0,
    });
  });

  it.each([
    ['ít hơn một trang', 5, 1],
    ['đúng một trang', 20, 1],
    ['dư đúng một dòng sang trang 2', 21, 2],
    ['đúng hai trang', 40, 2],
    ['hai trang lẻ một dòng', 41, 3],
  ])('%s → %s trang', (_label, total, expectedPageCount) => {
    expect(buildPageInfo(total, 1).pageCount).toBe(expectedPageCount);
  });

  it('thứ tự dòng đầu/cuối khớp với trang đang xem', () => {
    expect(buildPageInfo(45, 1)).toMatchObject({ rangeStart: 1, rangeEnd: 20 });
    expect(buildPageInfo(45, 2)).toMatchObject({ rangeStart: 21, rangeEnd: 40 });
    // Trang cuối chỉ có 5 dòng — `rangeEnd` phải là `total`, không phải 60.
    expect(buildPageInfo(45, 3)).toMatchObject({ rangeStart: 41, rangeEnd: 45 });
  });

  it('hasPrev / hasNext đúng ở cả ba vị trí', () => {
    expect(buildPageInfo(45, 1)).toMatchObject({ hasPrev: false, hasNext: true });
    expect(buildPageInfo(45, 2)).toMatchObject({ hasPrev: true, hasNext: true });
    expect(buildPageInfo(45, 3)).toMatchObject({ hasPrev: true, hasNext: false });
  });

  /**
   * Tình huống thật: đang ở `?page=9` của tháng 8 rồi đổi sang tháng 2 chỉ có 3
   * báo cáo. Nếu tin con số truyền vào thì giao diện hiện "trang 9/1" kèm nút
   * "Sau" bấm được — vừa sai vừa dẫn tới một trang trống.
   */
  it('kẹp trang vượt quá số trang thật về trang cuối', () => {
    expect(buildPageInfo(3, 9)).toMatchObject({
      page: 1,
      pageCount: 1,
      hasNext: false,
      rangeStart: 1,
      rangeEnd: 3,
    });
    expect(buildPageInfo(45, 99)).toMatchObject({ page: 3, pageCount: 3, hasNext: false });
  });

  it.each([
    ['trang 0', 45, 0],
    ['trang âm', 45, -7],
    ['NaN', 45, Number.NaN],
  ])('%s → kẹp về trang 1', (_label, total, page) => {
    expect(buildPageInfo(total, page).page).toBe(1);
  });

  it.each([
    ['total âm', -5],
    ['total NaN', Number.NaN],
    ['total Infinity', Number.POSITIVE_INFINITY],
    ['total thập phân', 4.5],
  ])('%s → coi như rỗng, KHÔNG sinh NaN', (_label, total) => {
    const info = buildPageInfo(total, 1);
    expect(info.total).toBe(0);
    expect(info.pageCount).toBe(1);
    expect(Number.isSafeInteger(info.rangeStart)).toBe(true);
    expect(Number.isSafeInteger(info.rangeEnd)).toBe(true);
  });

  it('không bao giờ sinh NaN hay số âm trên bất kỳ tổ hợp nào', () => {
    for (const total of [0, 1, 19, 20, 21, 199, 200, 201]) {
      for (const page of [-1, 0, 1, 2, 5, 50]) {
        const info = buildPageInfo(total, page);

        for (const value of [info.page, info.pageCount, info.total, info.rangeStart, info.rangeEnd]) {
          expect(Number.isSafeInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
        }

        expect(info.page).toBeGreaterThanOrEqual(1);
        expect(info.rangeEnd).toBeLessThanOrEqual(info.total);
      }
    }
  });
});
