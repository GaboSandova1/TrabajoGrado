'use client'

import styles from './AnalyzeLoaderFancy.module.css'

export function AnalyzeLoaderFancy() {
  return (
    <div className={styles.loader} role="status" aria-live="polite" aria-label="Analizando reseñas">
      <div className={styles.loaderInner}>
        <div className={`${styles.blob} ${styles.b1}`}></div>
        <div className={`${styles.blob} ${styles.b2}`}></div>
        <div className={`${styles.blob} ${styles.b3}`}></div>
        <div className={`${styles.blob} ${styles.b4}`}></div>
        <div className={`${styles.blob} ${styles.b5}`}></div>
        <div className={`${styles.blob} ${styles.b6}`}></div>
      </div>
    </div>
  )
}
