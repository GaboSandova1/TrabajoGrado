'use client'

import styles from './ThemeToggleFancy.module.css'

interface ThemeToggleFancyProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  label: string
}

export function ThemeToggleFancy({
  checked,
  onCheckedChange,
  disabled = false,
  label,
}: ThemeToggleFancyProps) {
  return (
    <div className="flex items-center justify-between rounded-md border-sidebar-border px-3 py-2">
      {/* <span className="rounded-md border border-sidebar-border bg-sidebar-accent px-2 py-1 text-sm text-sidebar-foreground">
        {label}
      </span> */}
      <label className={styles.switch} aria-label="Cambiar tema visual">
        <input
          type="checkbox"
          className={styles.input}
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
          disabled={disabled}
        />
        <span className={styles.slider}>
          <div className={styles.moonsHole}>
            <div className={styles.moonHole}></div>
            <div className={styles.moonHole}></div>
            <div className={styles.moonHole}></div>
          </div>
          <div className={styles.blackClouds}>
            <div className={styles.blackCloud}></div>
            <div className={styles.blackCloud}></div>
            <div className={styles.blackCloud}></div>
          </div>
          <div className={styles.clouds}>
            <div className={styles.cloud}></div>
            <div className={styles.cloud}></div>
            <div className={styles.cloud}></div>
            <div className={styles.cloud}></div>
            <div className={styles.cloud}></div>
            <div className={styles.cloud}></div>
            <div className={styles.cloud}></div>
          </div>
          <div className={styles.stars}>
            <svg className={styles.star} viewBox="0 0 20 20" aria-hidden="true">
              <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
            </svg>
            <svg className={styles.star} viewBox="0 0 20 20" aria-hidden="true">
              <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
            </svg>
            <svg className={styles.star} viewBox="0 0 20 20" aria-hidden="true">
              <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
            </svg>
            <svg className={styles.star} viewBox="0 0 20 20" aria-hidden="true">
              <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
            </svg>
            <svg className={styles.star} viewBox="0 0 20 20" aria-hidden="true">
              <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
            </svg>
          </div>
        </span>
      </label>
    </div>
  )
}
