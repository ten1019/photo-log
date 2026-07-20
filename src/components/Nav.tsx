import styles from './Nav.module.css'

export type Screen = 'home' | 'log' | 'mypage' | 'record'

const tabs: { key: Screen; label: string }[] = [
  { key: 'home', label: 'ホーム' },
  { key: 'log', label: 'ログ' },
  { key: 'mypage', label: 'マイページ' },
  { key: 'record', label: '＋ 記録する' },
]

export function Nav({
  current,
  onChange,
}: {
  current: Screen
  onChange: (s: Screen) => void
}) {
  return (
    <header className={styles.nav}>
      <div className={styles.brand}>PHOTO LOG</div>
      <nav className={styles.tabs}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${current === t.key ? styles.active : ''}`}
            onClick={() => onChange(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  )
}