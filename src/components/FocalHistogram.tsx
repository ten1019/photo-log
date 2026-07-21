import * as d3 from 'd3'
import styles from './Charts.module.css'

// 親から「各写真の焦点距離の配列」を受け取って描く
export function FocalHistogram({ focals }: { focals: number[] }) {
  // --- 1. データを区間ごとに集計 ---
  // 表示したい焦点距離の区切り（この値以上・次未満、で1つの棒）
  const bins = [
    { label: '16mm', min: 0, max: 20 },
    { label: '24mm', min: 20, max: 30 },
    { label: '35mm', min: 30, max: 42 },
    { label: '50mm', min: 42, max: 67 },
    { label: '85mm', min: 67, max: 110 },
    { label: '135mm', min: 110, max: 200 },
    { label: '200mm+', min: 200, max: Infinity },
  ]
  // 各区間に入る枚数を数える
  const data = bins.map((b) => ({
    label: b.label,
    count: focals.filter((f) => f >= b.min && f < b.max).length,
  }))

  // --- 2. 描画領域のサイズ ---
  const width = 100      // %ベースで描くので相対値。viewBoxで比率を決める
  const height = 55
  const padding = { top: 4, right: 2, bottom: 10, left: 2 }

  // --- 3. D3 の scale（ここがD3の本領：値→座標の変換ルール）---
  // 横：ラベルを等間隔に配置する scale
  const x = d3
    .scaleBand()
    .domain(data.map((d) => d.label))       // 入力：ラベルの一覧
    .range([padding.left, width - padding.right]) // 出力：左端〜右端のピクセル
    .padding(0.3)                            // 棒どうしの隙間

  // 縦：枚数を高さに変換する scale
  const maxCount = d3.max(data, (d) => d.count) ?? 1
  const y = d3
    .scaleLinear()
    .domain([0, maxCount])                   // 入力：0〜最大枚数
    .range([height - padding.bottom, padding.top]) // 出力：下端〜上端（上下反転に注意）

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartTitle}>FOCAL<span>焦点距離</span></div>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg}>
        {data.map((d) => {
          const barX = x(d.label)!            // この棒の左位置
          const barY = y(d.count)             // 棒の上端の位置
          const barW = x.bandwidth()          // 棒の幅
          const barH = height - padding.bottom - barY // 棒の高さ
          return (
            <g key={d.label}>
              {/* 棒本体 */}
              <rect x={barX} y={barY} width={barW} height={barH} className={styles.bar} rx={0.6} />
              {/* 枚数（棒の上に小さく） */}
              {d.count > 0 && (
                <text x={barX + barW / 2} y={barY - 1.2} className={styles.barValue}>
                  {d.count}
                </text>
              )}
              {/* ラベル（下） */}
              <text x={barX + barW / 2} y={height - 3} className={styles.barLabel}>
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}