import type { FirebaseError } from 'firebase/app';

export function messageFromFirebaseError(err: unknown): string {
  const e = err as Partial<FirebaseError> & { message?: string; code?: string };
  const code = e?.code || '';
  // functions の onCall は `functions/<code>` の形式になることがある
  const norm = code.startsWith('functions/') ? code.slice('functions/'.length) : code;
  switch (norm) {
    case 'unauthenticated':
      return '認証されていません。ページを更新して再度お試しください。';
    case 'permission-denied':
      return '権限がありません。操作できるユーザーか確認してください。';
    case 'invalid-argument':
      return '入力値が不正です。もう一度ご確認ください。';
    case 'failed-precondition':
      return '前提条件を満たしていません。状態を確認して再度お試しください。';
    case 'not-found':
      return '対象が見つかりません。URLやルーム状態をご確認ください。';
    default:
      return e?.message || '不明なエラーが発生しました。時間をおいて再度お試しください。';
  }
}

