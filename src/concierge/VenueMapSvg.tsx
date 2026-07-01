/**
 * 会場図(map_sample.jpg)を、ふわふわランドの暖色パレットでベクター再現したもの。
 * 区画の位置・比率・表記文言は実際の会場図に合わせているが、色とタイポグラフィは
 * 世界観に合わせて描き直している(実写真の色そのものの再現が目的ではない)。
 * booth用の"00"ドットは装飾であり、特定の出展者を指すものではない
 * (対応表が未確定のため。demoData.ts のピンとは独立)。
 *
 * viewBoxは 0 0 1724 1012 で、MapScreen.tsx の mapX/mapY(%指定)とそのまま揃う。
 */

const OUTER = { x: 70, y: 108, w: 1590, h: 850, r: 36 };

const ZONES = [
  { key: "multi", x: 96, y: 320, w: 470, h: 470, fill: "#dfeef2", stroke: "#69bdb5", label: "多職種でひとりの身体を診る文化", gridCols: 4, gridRows: 4 },
  { key: "kenko", x: 590, y: 320, w: 350, h: 470, fill: "#eaf6e2", stroke: "#8bd46e", label: "健康を考える日を創る文化", gridCols: 3, gridRows: 3 },
  { key: "ouen", x: 1030, y: 320, w: 470, h: 470, fill: "#fdeaf0", stroke: "#ff8fab", label: "応援文化", gridCols: 4, gridRows: 4 },
];

const CENTER_STRIP = [
  { key: "engichi", y: 320, h: 118, fill: "#fbe28f", label: "こども縁日・総選挙", fontSize: 12 },
  { key: "tanupei", y: 438, h: 96, fill: "#f5d36a", label: "たぬぺいTIME.", fontSize: 13 },
  { key: "yagura", y: 534, h: 96, fill: "#e2685a", label: "やぐら", textColor: "#fff", fontSize: 18 },
  { key: "shujinko", y: 630, h: 160, fill: "#f2c94c", label: "こども主人公", fontSize: 15 },
];
const CENTER_X = 944;
const CENTER_W = 82;

const BOTTOM_BANNERS = [
  { x: 96, w: 500, label: "RUMI TIME." },
  { x: 612, w: 250, label: "ラピ子 TIME." },
  { x: 878, w: 620, label: "RUMI TIME." },
];

function BoothDots({ x, y, w, h, cols, rows }: { x: number; y: number; w: number; h: number; cols: number; rows: number }) {
  const dots = [];
  const padX = w * 0.12;
  const padY = h * 0.14;
  const stepX = (w - padX * 2) / Math.max(cols - 1, 1);
  const stepY = (h - padY * 2) / Math.max(rows - 1, 1);
  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      // 元図同様、市松に少し欠けを作って単調な格子に見えないようにする
      if ((row + col) % 5 === 4) {
        index += 1;
        continue;
      }
      // 装飾のブース枠(実データが来たらここが実ピンになる想定)。
      // 操作対象の実ピン(MapScreenのBoothPin)を目立たせるため、控えめにする。
      dots.push(
        <circle
          key={index}
          cx={x + padX + col * stepX}
          cy={y + padY + row * stepY}
          r={11}
          fill="rgba(255,255,255,0.55)"
          stroke="rgba(74,55,40,0.18)"
          strokeWidth={2}
        />,
      );
      index += 1;
    }
  }
  return <>{dots}</>;
}

export function VenueMapSvg() {
  return (
    <svg viewBox="0 0 1724 1012" width="100%" height="100%" role="img" aria-label="YourTIME 会場マップ（簡略図）">
      <rect x={0} y={0} width={1724} height={1012} fill="#fbf4e6" />

      {/* 会場外周 */}
      <rect x={OUTER.x} y={OUTER.y} width={OUTER.w} height={OUTER.h} rx={OUTER.r} fill="#fdf6e3" stroke="#e7dcc5" strokeWidth={3} />

      {/* 上部: 入口案内 */}
      <g>
        <rect x={380} y={30} width={190} height={50} rx={14} fill="#c0483f" />
        <text x={475} y={62} textAnchor="middle" fontSize={26} fontWeight={900} fill="#fff">再入場入口</text>
        <path d="M420 90 L420 130 M400 110 L420 130 L440 110" stroke="#c0483f" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />

        <rect x={640} y={30} width={170} height={50} rx={14} fill="#c0483f" />
        <text x={725} y={62} textAnchor="middle" fontSize={26} fontWeight={900} fill="#fff">会場入口</text>
        <path d="M700 90 L700 130 M680 110 L700 130 L720 110" stroke="#c0483f" strokeWidth={6} strokeDasharray="8 6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* 上部: 受付エリア/フードエリア/cOral up */}
      <g>
        <rect x={96} y={150} width={330} height={110} rx={18} fill="#bcd9e6" />
        <text x={261} y={212} textAnchor="middle" fontSize={30} fontWeight={900} fill="#17324d">cOral up</text>

        <rect x={1030} y={150} width={100} height={70} rx={10} fill="#c0483f" />
        <text x={1080} y={192} textAnchor="middle" fontSize={22} fontWeight={900} fill="#fff">受付</text>

        <rect x={1140} y={150} width={130} height={70} rx={10} fill="#f2d36f" />
        <text x={1205} y={186} textAnchor="middle" fontSize={16} fontWeight={800} fill="#4a3410">ベビーカー</text>
        <text x={1205} y={206} textAnchor="middle" fontSize={16} fontWeight={800} fill="#4a3410">置き場</text>

        <rect x={1280} y={150} width={340} height={70} rx={10} fill="#f5a623" />
        <text x={1450} y={192} textAnchor="middle" fontSize={26} fontWeight={900} fill="#fff">フードエリア</text>
      </g>

      {/* 3ゾーン */}
      {ZONES.map((zone) => (
        <g key={zone.key}>
          <rect x={zone.x} y={zone.y} width={zone.w} height={zone.h} rx={20} fill={zone.fill} stroke={zone.stroke} strokeWidth={3} />
          <BoothDots x={zone.x} y={zone.y} w={zone.w} h={zone.h} cols={zone.gridCols} rows={zone.gridRows} />
          <rect x={zone.x + 20} y={zone.y + zone.h - 68} width={zone.w - 40} height={48} rx={12} fill="#ffffff" opacity={0.88} />
          <text
            x={zone.x + zone.w / 2}
            y={zone.y + zone.h - 34}
            textAnchor="middle"
            fontSize={22}
            fontWeight={900}
            fill="#17324d"
          >
            {zone.label}
          </text>
        </g>
      ))}

      {/* 中央帯: こども縁日〜こども主人公 */}
      {CENTER_STRIP.map((cell) => (
        <g key={cell.key}>
          <rect x={CENTER_X} y={cell.y} width={CENTER_W} height={cell.h} rx={12} fill={cell.fill} />
          <text
            x={CENTER_X + CENTER_W / 2}
            y={cell.y + cell.h / 2}
            textAnchor="middle"
            fontSize={cell.fontSize}
            fontWeight={900}
            fill={cell.textColor ?? "#4a3410"}
            style={{ writingMode: "vertical-rl" }}
          >
            {cell.label}
          </text>
        </g>
      ))}

      {/* ステージ */}
      <rect x={1550} y={360} width={100} height={400} rx={16} fill="#f2d36f" />
      <text x={1600} y={560} textAnchor="middle" fontSize={22} fontWeight={900} fill="#4a3410" style={{ writingMode: "vertical-rl" }}>
        ステージ
      </text>

      {/* 応援エリア横: にぎわいの人影(装飾・簡略) */}
      <g fill="#e2a76b" opacity={0.55}>
        <circle cx={1520} cy={470} r={16} />
        <circle cx={1500} cy={540} r={14} />
        <circle cx={1530} cy={600} r={15} />
        <circle cx={1490} cy={650} r={13} />
      </g>

      {/* 下部バナー */}
      {BOTTOM_BANNERS.map((banner, index) => (
        <g key={index}>
          <rect x={banner.x} y={820} width={banner.w} height={100} rx={16} fill="#f2d36f" />
          <text x={banner.x + banner.w / 2} y={878} textAnchor="middle" fontSize={26} fontWeight={900} fill="#4a3410">
            {banner.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
