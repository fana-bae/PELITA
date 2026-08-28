'use client'

import { useEffect, useState } from 'react'
import { checkAndUpdateStreak } from '@/lib/actions/streak'
import styles from './StreakModal.module.css'

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function StreakModal() {
  const [show, setShow] = useState(false)
  const [data, setData] = useState(null) // { status: 'continue'|'broken'|'none', streak: number, oldStreak?: number }
  const [animState, setAnimState] = useState('entering') // entering, breaking, static

  useEffect(() => {
    // Only check once per session to avoid spamming on every page load
    const checked = sessionStorage.getItem('streak_checked')
    if (checked) return

    async function checkStreak() {
      try {
        const result = await checkAndUpdateStreak()
        sessionStorage.setItem('streak_checked', 'true')
        
        if (result.status === 'continue' || result.status === 'broken') {
          setData(result)
          setShow(true)
          
          if (result.status === 'broken') {
            // Start with breaking animation, then switch to static (new streak 1)
            setAnimState('breaking')
            setTimeout(() => {
              setAnimState('static')
            }, 1500) // length of shatter animation
          } else {
            setAnimState('entering')
          }
        }
      } catch (err) {
        console.error('Failed to check streak', err)
      }
    }
    
    checkStreak()
  }, [])

  if (!show || !data) return null

  const isBroken = data.status === 'broken' && animState === 'breaking'
  
  // Calculate which days to show as checked based on current day and streak
  const today = new Date().getDay()
  
  // Render 7 days. If streak is 3, today and 2 previous days are checked.
  // We'll show Sun-Sat. 
  // If streak is N, any day between (today - N + 1) and today is checked.
  // Need to handle wrap around (e.g. today is Tuesday(2), streak is 4. Sat(6), Sun(0), Mon(1), Tue(2) checked)
  const currentStreak = isBroken ? data.oldStreak : data.streak

  const getCheckStatus = (dayIndex) => {
    // If it's a future day relative to today, it's not checked
    // We'll just show the last 7 days ending in today, or fixed Sun-Sat. 
    // Duolingo shows fixed Mon-Sun or Sun-Sat. Let's do fixed Sun-Sat.
    let diff = today - dayIndex
    if (diff < 0) diff += 7 // Wrap around
    
    // If the diff is less than the current streak, it means it's part of the streak
    // Example: Today is We(3). Streak is 2. We(3) diff=0 < 2 (Checked). Tu(2) diff=1 < 2 (Checked). Mo(1) diff=2 (Not checked). Th(4) diff=6 (Not checked)
    
    // BUT this only works if streak <= 7. If streak > 7, all are checked.
    if (currentStreak >= 7) return 'active'
    if (diff < currentStreak) return 'active'
    
    // Future days in this week
    if (dayIndex > today) return 'future'
    
    return 'inactive'
  }

  const CheckIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  )

  return (
    <div className={styles.overlay}>
      <div className={`${styles.modal} ${isBroken ? styles.modalShake : styles.modalBounce}`}>
        
        <div className={`${styles.fireIconContainer} ${isBroken ? styles.fireBroken : styles.fireActive}`}>
          {isBroken ? '🧊' : '🔥'}
        </div>
        
        <h1 className={`${styles.number} ${isBroken ? styles.numberBroken : ''}`}>
          {isBroken ? data.oldStreak : data.streak}
        </h1>
        
        <div className={`${styles.subtitle} ${isBroken ? styles.subtitleBroken : ''}`}>
          day streak
        </div>

        <div className={styles.daysTracker}>
          {DAYS.map((day, idx) => {
            const status = getCheckStatus(idx)
            return (
              <div key={day} className={styles.dayCol}>
                <span className={`${styles.dayLabel} ${idx === today ? styles.dayLabelActive : ''}`}>{day}</span>
                <div className={`
                  ${styles.dayCircle} 
                  ${status === 'active' && !isBroken ? styles.dayCircleActive : ''} 
                  ${status === 'future' ? styles.dayCircleFuture : ''}
                `}>
                  {(status === 'active' && !isBroken) ? <CheckIcon /> : ''}
                </div>
              </div>
            )
          })}
        </div>

        <div className={`${styles.message} ${isBroken ? styles.messageBroken : ''}`}>
          {isBroken ? (
             <>Oh no! You lost your <strong>{data.oldStreak} day</strong> streak. <br/>Time to start over from 1!</>
          ) : (
            data.streak % 7 === 0 ? (
              <>You earned a <strong>Perfect Streak</strong> bonus for practicing 7 days in a row!</>
            ) : (
              <>You're on a roll! Keep it up for <strong>{7 - (data.streak % 7)} more days</strong> to get a bonus!</>
            )
          )}
        </div>

        <button className={styles.btn} onClick={() => setShow(false)}>
          {isBroken ? 'Mulai Kembali' : 'Lanjutkan'}
        </button>
      </div>
    </div>
  )
}
