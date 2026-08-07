'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

/**
 * Draft cục bộ cho form báo cáo — FR-035, rule `form-autosave`.
 *
 * **Server vẫn là nguồn sự thật duy nhất.** Draft chỉ để khôi phục những gì
 * người dùng đã gõ khi mất mạng, hết phiên, hay lỡ đóng tab (`docs/05 §8` mục 4).
 * Nó không bao giờ được coi là "đã lưu".
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO HOOK NÀY NẰM Ở `lib/` CHỨ KHÔNG Ở `features/report-morning/`
 * ─────────────────────────────────────────────────────────────────────────
 *  Nó ra đời ở Phase 3 cho form đầu ngày, và Phase 4 cần đúng nó cho form cuối
 *  ngày. `features/report-evening/` **không được** import `features/report-morning/`
 *  (AGENTS.md §1.2) — dùng chung thì phải nâng lên `lib/`. Hook này đủ điều kiện
 *  để ở đây: nó không biết một chữ nào về báo cáo, chỉ nhận một khoá chuỗi và
 *  một object `Record<string, string>` (DEC-035).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO DÙNG `useSyncExternalStore` CHỨ KHÔNG `useEffect` + `setState`
 * ─────────────────────────────────────────────────────────────────────────
 *  localStorage là một **external store** đúng nghĩa, và đây là API React sinh
 *  ra cho đúng việc đó. Cách viết quen thuộc hơn — `useEffect` đọc localStorage
 *  rồi `setState` — bị React Compiler chặn thẳng
 *  (`react-hooks/set-state-in-effect`: "Calling setState synchronously within an
 *  effect can trigger cascading renders"), và nó cũng thật sự tạo thêm một vòng
 *  render sau mỗi lần hydrate.
 *
 *  `getServerSnapshot` trả `null` nên HTML của server và lần render hydrate của
 *  client giống hệt nhau; React tự re-render với dữ liệu thật ngay sau đó. Không
 *  có hydration mismatch, và **không có setState nào nằm trong effect**.
 *
 * Hai điều còn lại đáng chú ý:
 *
 * 1. **Khoá localStorage gắn với ngày nghiệp vụ.** Draft của hôm qua không bao
 *    giờ được rót vào form hôm nay — đó sẽ là một cách nhập bù ngày cũ đi vòng
 *    qua BR-021.
 * 2. **Mọi thao tác đều bọc `try/catch`.** Safari ở chế độ riêng tư ném lỗi khi
 *    ghi localStorage; mất draft là chuyện nhỏ, làm hỏng cả form là chuyện lớn.
 */

export type DraftValues = Record<string, string>;

type UseReportDraftResult<T extends DraftValues> = {
  values: T;
  setValue: (field: keyof T & string, value: string) => void;
  /** Có thay đổi chưa lưu so với dữ liệu server gửi xuống. */
  isDirty: boolean;
  /** Đã nạp lại nội dung nhập dở từ lần trước — UI phải nói cho người dùng biết. */
  restoredFromDraft: boolean;
  /** Bỏ draft, quay về đúng dữ liệu của server. */
  discardDraft: () => void;
  /** Xoá draft sau khi LƯU THÀNH CÔNG — gọi trước khi điều hướng. */
  clearDraft: () => void;
};

/* ---------------------------------------------------------------------------
 * Store: localStorage + một tập listener để các hook cùng khoá cùng cập nhật.
 * `storage` event của trình duyệt CHỈ bắn sang tab khác, nên thay đổi do chính
 * tab này gây ra phải tự phát tín hiệu.
 * ------------------------------------------------------------------------- */

const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  window.addEventListener('storage', onStoreChange);

  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

function emitChange(): void {
  for (const listener of listeners) listener();
}

/**
 * `getSnapshot` phải trả giá trị ỔN ĐỊNH khi dữ liệu không đổi, nếu không React
 * sẽ render vô hạn. Trả về **chuỗi thô** của localStorage (so sánh theo giá trị)
 * chứ không phải object đã parse — việc parse để `useMemo` lo.
 */
function readRawDraft(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parseDraft(raw: string | null): DraftValues | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;

    // Chỉ giữ cặp khoá/giá trị là chuỗi — localStorage có thể bị sửa tay.
    const result: DraftValues = {};
    for (const [field, value] of Object.entries(parsed)) {
      if (typeof value === 'string') result[field] = value;
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

function writeDraft(key: string, values: DraftValues): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // Hết quota hoặc chế độ riêng tư — bỏ qua, form vẫn dùng được bình thường.
  }
  emitChange();
}

function removeDraft(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Như trên.
  }
  emitChange();
}

function shallowEqual(a: DraftValues, b: DraftValues): boolean {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => a[key] === b[key]);
}

export function useReportDraft<T extends DraftValues>(
  storageKey: string,
  initialValues: T,
): UseReportDraftResult<T> {
  /**
   * Ảnh chụp giá trị server gửi xuống, dùng để so ra `isDirty`.
   * `useState` chỉ lấy đối số ở lần render đầu ⇒ ổn định suốt vòng đời form,
   * dù `initialValues` là object literal mới ở mỗi lần render.
   */
  const [baseline] = useState<T>(initialValues);

  /** Người dùng đã gõ ít nhất một ký tự trong phiên này. */
  const [hasEdited, setHasEdited] = useState(false);

  const rawDraft = useSyncExternalStore(
    subscribe,
    () => readRawDraft(storageKey),
    () => null,
  );

  const draft = useMemo(() => parseDraft(rawDraft), [rawDraft]);

  const values = useMemo(
    () => (draft === null ? baseline : ({ ...baseline, ...draft } as T)),
    [draft, baseline],
  );

  const setValue = useCallback(
    (field: keyof T & string, value: string) => {
      setHasEdited(true);
      writeDraft(storageKey, { ...values, [field]: value });
    },
    [storageKey, values],
  );

  const isDirty = draft !== null && !shallowEqual(values, baseline);

  // Nội dung nhập dở của LẦN TRƯỚC: có draft nhưng phiên này chưa gõ gì.
  const restoredFromDraft = draft !== null && !hasEdited;

  /**
   * Cảnh báo khi rời trang lúc form đang có thay đổi chưa lưu
   * (rule `sheet-dismiss-confirm`, Master Spec §30).
   *
   * Effect này chỉ ĐĂNG KÝ listener, không `setState` — đúng vai trò mà React
   * dành cho `useEffect`. Sau khi lưu thành công, `clearDraft()` xoá draft nên
   * `isDirty` thành `false` và listener tự gỡ trước khi form điều hướng đi.
   */
  useEffect(() => {
    if (!isDirty) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const clearDraft = useCallback(() => {
    removeDraft(storageKey);
  }, [storageKey]);

  const discardDraft = useCallback(() => {
    removeDraft(storageKey);
    setHasEdited(false);
  }, [storageKey]);

  return { values, setValue, isDirty, restoredFromDraft, discardDraft, clearDraft };
}
