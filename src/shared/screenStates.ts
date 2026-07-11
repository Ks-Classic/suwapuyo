import type { DisplayState } from "./mvpTypes";

export const DISPLAY_STATES: readonly DisplayState[] = [
  "initial", "loading", "empty", "invalid", "network-error", "forbidden", "offline-unsynced", "demo", "reduced-motion",
];

export type MvpScreenId = "001" | "002" | "003" | "004" | "005" | "006" | "007" | "008" | "009" | "010" | "011" | "013" | "014" | "017" | "018" | "102";

export interface ScreenStateDefinition {
  state: DisplayState;
  behavior: string;
}

function definitions(screen: string): ScreenStateDefinition[] {
  return [
    { state: "initial", behavior: `${screen}の主目的と主CTAを表示する` },
    { state: "loading", behavior: "キャラクターまたは骨格表示で待機し、操作を重ねない" },
    { state: "empty", behavior: "空の理由と安全な次の操作を表示する" },
    { state: "invalid", behavior: "入力箇所の近くで修正方法を示す" },
    { state: "network-error", behavior: "内部コードを見せず再試行と戻る操作を示す" },
    { state: "forbidden", behavior: "権限がないことと安全な戻り先だけを示す" },
    { state: "offline-unsynced", behavior: "未同期を明示し、対象イベントは端末キューへ退避する" },
    { state: "demo", behavior: "デモデータ種別バッジを常時表示する" },
    { state: "reduced-motion", behavior: "移動・群演出・カウントアップを静止または即時切替にする" },
  ];
}

export const SCREEN_STATE_MATRIX: Record<MvpScreenId, ScreenStateDefinition[]> = {
  "001": definitions("起動・認証"), "002": definitions("友だち追加"), "003": definitions("初回歓迎"), "004": definitions("家族アンケート"),
  "005": definitions("キャラ登場"), "006": definitions("ホーム"), "007": definitions("ゲーム"), "008": definitions("キャラ選択"),
  "009": definitions("体操"), "010": definitions("たいそうのきろく"), "011": definitions("ミッション"), "013": definitions("ブース一覧"),
  "014": definitions("ブース紹介sheet"), "017": definitions("会場マップ"), "018": definitions("同意"), "102": definitions("出展者レポート"),
};
