# Draft Simulator

本リポジトリは、ポケモンユナイトの「3BANドラフト」を体験できるデモアプリです。フロントエンドは React + TypeScript（Vite）、バックエンドは Firebase（Cloud Functions for Firebase v2 + Firestore）で構成し、Firebase Hosting で配信します。

- ユーザー向け仕様は `docs/01_仕様書.md` を参照してください。
- 本 README は開発・運用者向けにセットアップ/実行/デプロイ手順を中心に記載します。

---

## 技術スタックとディレクトリ

- フロントエンド: `frontend/`
  - React + TypeScript + Vite
  - Tailwind CSS / ESLint / Prettier
- バックエンド: `functions/`
  - Cloud Functions for Firebase v2（TypeScript）
  - Firestore（セキュリティルール: `firestore.rules`）
- Firebase 設定: ルートの `firebase.json` / `.firebaserc`

```
.
├─ frontend/           # Web クライアント
├─ functions/          # Cloud Functions (TypeScript)
├─ docs/               # 仕様・設計ドキュメント
├─ firebase.json       # Firebase 各種設定
├─ .firebaserc         # プロジェクトエイリアス（default/prod）
└─ firestore.rules     # Firestore セキュリティルール
```

---

## 前提条件（Prerequisites）

- Node.js 18 以上（`frontend/package.json` と `functions/package.json` の engines に準拠）
- npm（または Node 同梱の Corepack + pnpm/yarn でも可。ただし本リポジトリは `package-lock.json` を含むため npm を推奨）
- Firebase CLI（`npm i -g firebase-tools` もしくは `npx firebase-tools <cmd>`）
- Firebase プロジェクト（テスト用/本番用）
  - `.firebaserc` には `default: demo-draft`、`prod: unite-draft-simulator` が定義済み

補足（ローカルエミュレータ利用時）
- Java ランタイムが必要な場合があります（Firebase Emulator UI/一部エミュレータ）。

---

## 初回セットアップ

1) リポジトリの依存関係をインストール

- フロントエンド
  - `cd frontend`
  - `npm ci`
- Functions（TSコンパイル用）
  - `cd functions`
  - `npm ci`

2) Firebase CLI ログインとプロジェクト選択

- ログイン: `firebase login`
- 既定のプロジェクトを確認/切替
  - `firebase use`              # 現在の選択を表示
  - `firebase use default`      # 開発用 (demo-draft)
  - `firebase use prod`         # 本番用 (unite-draft-simulator)

3) フロントエンドの環境変数を設定

- 雛形: `frontend/.env.example`
- 開発用ファイルを作成して編集
  - `cp frontend/.env.example frontend/.env.development.local`
  - Firebase コンソールの Web アプリ設定から `VITE_FIREBASE_*` を設定
  - エミュレータ利用時は `VITE_USE_EMULATORS=true` のままで OK

4) Firestore ルール（必要ならデプロイ/エミュレータへ適用）

- ローカルエミュレータ起動時は `firebase.json` の設定が自動適用
- 実プロジェクトへ反映する場合: `firebase deploy --only firestore:rules`

---

## ローカル開発（Emulators + Vite）

推奨は 3 ターミナル構成です。

- Terminal A（Functions TypeScript のウォッチビルド）
  - `cd functions`
  - `npm run watch`

- Terminal B（Firebase Emulators）
  - ルートで実行
  - `firebase emulators:start`
  - 既定ポート（`firebase.json`）
    - Auth: 9099 / Firestore: 8080 / Functions: 5001 / Emulator UI: 自動

- Terminal C（フロントエンド Dev サーバ）
  - `cd frontend`
  - エミュレータ接続で起動: `npm run dev:emu`
  - ブラウザで Vite の URL（通常 `http://localhost:5173`）へアクセス

注意
- Functions は `functions/lib` にトランスパイルされた JS を参照します。エミュレータ起動前に Terminal A のウォッチを開始してください。
- フロントエンドがエミュレータへ向くかは `VITE_USE_EMULATORS` で切替（true の場合、`localhost` のポート群へ接続）。

---

## ビルド（本番前検証）

- フロントエンド: `cd frontend && npm run build`（出力: `frontend/dist`）
- Functions: `cd functions && npm run build`（出力: `functions/lib`）
- ローカルで Hosting エミュレータ配信を確認したい場合
  - ルートで `firebase emulators:start --only hosting`
  - 別ターミナルで `cd frontend && npm run build` を更新都度実行

---

## デプロイ手順（Firebase Hosting + Functions）

基本の流れ

1) プロジェクトを選択
- 開発: `firebase use default`
- 本番: `firebase use prod`

2) ビルド
- `cd frontend && npm run build`
- `cd functions && npm run build`

3) デプロイ
- 両方まとめて: `firebase deploy --only hosting,functions`
- 片方のみ
  - Hosting: `firebase deploy --only hosting`
  - Functions: `firebase deploy --only functions`

補足
- Functions は v2（リージョン: `asia-northeast1`）を使用しています。初回デプロイ前に対象プロジェクトで必要な API（Cloud Functions/Firestore/Cloud Tasks など）を有効化してください。
- `frontend/.env.production` を用意して本番用の `VITE_FIREBASE_*` を設定しておくと安全です。

---

## スクリプト一覧（抜粋）

- `frontend`
  - `npm run dev`: Vite 開発サーバ
  - `npm run dev:emu`: エミュレータ向け設定で Vite 起動
  - `npm run build`: TypeScript ビルド + Vite 本番ビルド
  - `npm run preview`: ビルド物のプレビュー
  - `npm run lint`: ESLint 実行
  - `npm run format`: Prettier で整形
- `functions`
  - `npm run watch`: TypeScript ウォッチコンパイル（`lib/` 出力）
  - `npm run build`: TypeScript ビルド（`lib/` 出力）

---

## コーディング規約とツール

- フロントエンド
  - Linter: ESLint（設定: `frontend/eslint.config.js`）
  - Formatter: Prettier（設定: `frontend/.prettierrc` 等）
  - CSS: Tailwind CSS（設定: `frontend/tailwind.config.ts`）
- バックエンド（Functions）
  - TypeScript で記述。現状 ESLint 設定は未導入のため、型エラーは `tsc` にて検出します。

---

## よくあるハマりどころ（Troubleshooting）

- Emulators が関係ポートで起動しない
  - 既存プロセスで使用中の可能性。関連ポート（8080/5001/9099 など）を解放して再実行。
- Functions がエミュレータで動かない/404 になる
  - `functions/lib` が未生成の可能性。`npm run watch` を起動してから `firebase emulators:start` を実行。
- 認証が常に未ログイン扱いになる
  - フロントエンドの `.env.*` で `VITE_USE_EMULATORS=true` を確認。Auth エミュレータのポート 9099 が起動しているか確認。
- 本番デプロイ後に関数のリージョン不一致
  - フロントエンドの `VITE_FUNCTIONS_REGION` を `asia-northeast1` に設定して再ビルド。

---

## ライセンス

このリポジトリに明示的なライセンスが含まれていない場合、著作権は著作者に留保されます。利用・改変の前に作者へ確認してください。

---

## 参考

- 仕様概要: `docs/01_仕様書.md`
- シーケンス図
  - `docs/02_シーケンス図_ロビー作成_ドラフト開始.md`
  - `docs/03_シーケンス図_ドラフト1ターン目.md`
