// Character name mapping:
// ghost (おばけ) = わのの
// tooth (歯)     = わーわー
// blob  (おしゃぶり) = すーすー
// tanuki(タヌキ) = たぬぺい
export type PuyoType = "ghost" | "tooth" | "blob" | "tanuki";

export interface PuyoTypeConfig {
  id: PuyoType;
  name: string;
  themeColor: string;
  defaultMinPop: number;
  sounds: {
    pop1: string;
    pop2: string;
    pop3: string;
    pop4: string;
  };
  sprites: {
    idle: string;
    connected: string;
    popping: string;
    preview: string;
  };
}

export const PUYO_TYPES: Record<PuyoType, PuyoTypeConfig> = {
  ghost: {
    id: "ghost",
    name: "わのの",
    themeColor: "#C8E6F0",
    defaultMinPop: 4,
    sounds: {
      pop1: "ghost_pop1",
      pop2: "ghost_pop2",
      pop3: "ghost_pop3",
      pop4: "ghost_pop4",
    },
    sprites: {
      idle: "/content/01_すわぷよ/02_ゲームスプライト/04_わのの/01_待機.png",
      connected: "/content/01_すわぷよ/02_ゲームスプライト/04_わのの/01_待機.png",
      popping: "/content/01_すわぷよ/02_ゲームスプライト/04_わのの/01_待機.png",
      preview: "/content/01_すわぷよ/02_ゲームスプライト/04_わのの/02_プレビュー.png",
    },
  },
  tooth: {
    id: "tooth",
    name: "わーわー",
    themeColor: "#FFF5E0",
    defaultMinPop: 4,
    sounds: {
      pop1: "tooth_pop1",
      pop2: "tooth_pop2",
      pop3: "tooth_pop3",
      pop4: "tooth_pop4",
    },
    sprites: {
      idle: "/content/01_すわぷよ/02_ゲームスプライト/02_わーわー/01_待機.png",
      connected: "/content/01_すわぷよ/02_ゲームスプライト/02_わーわー/01_待機.png",
      popping: "/content/01_すわぷよ/02_ゲームスプライト/02_わーわー/01_待機.png",
      preview: "/content/01_すわぷよ/02_ゲームスプライト/02_わーわー/02_プレビュー.png",
    },
  },
  blob: {
    id: "blob",
    name: "すーすー",
    themeColor: "#E8E8F0",
    defaultMinPop: 3,
    sounds: {
      pop1: "blob_pop1",
      pop2: "blob_pop2",
      pop3: "blob_pop3",
      pop4: "blob_pop4",
    },
    sprites: {
      idle: "/content/01_すわぷよ/02_ゲームスプライト/01_すーすー/01_待機.png",
      connected: "/content/01_すわぷよ/02_ゲームスプライト/01_すーすー/01_待機.png",
      popping: "/content/01_すわぷよ/02_ゲームスプライト/01_すーすー/01_待機.png",
      preview: "/content/01_すわぷよ/02_ゲームスプライト/01_すーすー/02_プレビュー.png",
    },
  },
  tanuki: {
    id: "tanuki",
    name: "たぬぺい",
    themeColor: "#B08860",
    defaultMinPop: 5,
    sounds: {
      pop1: "tanuki_pop1",
      pop2: "tanuki_pop2",
      pop3: "tanuki_pop3",
      pop4: "tanuki_pop4",
    },
    sprites: {
      idle: "/content/01_すわぷよ/02_ゲームスプライト/03_たぬぺい/01_待機.png",
      connected: "/content/01_すわぷよ/02_ゲームスプライト/03_たぬぺい/01_待機.png",
      popping: "/content/01_すわぷよ/02_ゲームスプライト/03_たぬぺい/01_待機.png",
      preview: "/content/01_すわぷよ/02_ゲームスプライト/03_たぬぺい/02_プレビュー.png",
    },
  },
};

export const PUYO_TYPE_IDS: PuyoType[] = ["ghost", "tooth", "blob", "tanuki"];
