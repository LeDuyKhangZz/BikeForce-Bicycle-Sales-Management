/**
 * Khoá localStorage của draft báo cáo — FR-035.
 *
 * Tách ra `lib/` vì có tới ba nơi cần biết đúng chuỗi này: form đầu ngày, form
 * cuối ngày, và `DiscardEveningDraft` trên `/sales/today`. Gõ lại chuỗi ở nơi
 * thứ ba là cách chắc chắn nhất để một ngày nào đó nó lệch một dấu hai chấm và
 * việc dọn draft im lặng ngừng hoạt động.
 *
 * ⚠ Khoá LUÔN gắn với **ngày nghiệp vụ** (`YYYY-MM-DD` theo giờ VN), không phải
 * ngày của máy client: draft hôm qua không bao giờ được rót vào form hôm nay —
 * đó sẽ là một đường nhập bù ngày cũ đi vòng qua BR-021.
 */

const MORNING_DRAFT_PREFIX = 'bikeforce:morning-draft:';
const EVENING_DRAFT_PREFIX = 'bikeforce:evening-draft:';

export function morningDraftKey(businessDate: string): string {
  return `${MORNING_DRAFT_PREFIX}${businessDate}`;
}

export function eveningDraftKey(businessDate: string): string {
  return `${EVENING_DRAFT_PREFIX}${businessDate}`;
}
