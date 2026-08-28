'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './Leaderboard.module.css'

const TABS = [
  { id: 'all', label: 'All time' },
  { id: 'month', label: 'This month' },
  { id: 'week', label: 'This week' }
]

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function RankIcon({ rank }) {
  if (rank === 1) return <span className={styles.medalIcon}>🥇</span>
  if (rank === 2) return <span className={styles.medalIcon}>🥈</span>
  if (rank === 3) return <span className={styles.medalIcon}>🥉</span>
  return <span className={styles.rankNumber}>{rank}</span>
}

export default function LeaderboardClient({ initialLeaderboard, currentUserId }) {
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard)
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const supabase = createClient()

  // Realtime subscription
  useEffect(() => {
    // We listen to points_log table. When any point is added, we refetch leaderboard.
    // We could listen to profiles, but leaderboard view relies on points_log for weekly/monthly
    const channel = supabase.channel('leaderboard-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'points_log' }, async (payload) => {
        // Refetch the leaderboard data (since it's a view, we have to query it again)
        const { data } = await supabase.from('leaderboard').select('*').limit(100)
        if (data) {
          setLeaderboard(data)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Sorting based on active tab
  let list = [...leaderboard]
  if (activeTab === 'week') {
    list.sort((a, b) => b.weekly_points - a.weekly_points || b.streak_days - a.streak_days)
  } else if (activeTab === 'month') {
    list.sort((a, b) => b.monthly_points - a.monthly_points || b.streak_days - a.streak_days)
  } else {
    // All time is already sorted by default in the view, but let's ensure
    list.sort((a, b) => b.total_points - a.total_points || b.streak_days - a.streak_days)
  }

  // Search filtering
  if (search.trim()) {
    list = list.filter(u => {
      const name = (u.full_name || u.username || '').toLowerCase()
      return name.includes(search.toLowerCase())
    })
  }

  return (
    <div className={`${styles.page} page-enter`}>
      <div className={styles.tableContainer}>
        
        {/* Header & Controls */}
        <div className={styles.headerRow}>
          <h1 className={styles.title}>General Leaderboard</h1>
          
          <div className={styles.controls}>
            <div className={styles.searchBox}>
              <span>🔍</span>
              <input 
                type="text" 
                className={styles.searchInput} 
                placeholder="Search..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <div className={styles.tabs}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>#</th>
                <th>Name</th>
                <th>Streak</th>
                <th>Completed Tasks</th>
                <th>Total Point</th>
              </tr>
            </thead>
            <tbody>
              {list.map((user, idx) => {
                const isMe = user.id === currentUserId
                // Determine rank based on current sorted array index + 1
                const rank = idx + 1
                
                // Points to display based on active tab
                let displayPts = user.total_points
                if (activeTab === 'week') displayPts = user.weekly_points
                if (activeTab === 'month') displayPts = user.monthly_points

                return (
                  <tr key={user.id} className={isMe ? styles.rowMe : ''}>
                    <td className={styles.colRank}>
                      <RankIcon rank={rank} />
                    </td>
                    <td>
                      <div className={styles.colUser}>
                        <div className={styles.avatar}>
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" />
                          ) : (
                            <span>{getInitials(user.full_name || user.username)}</span>
                          )}
                        </div>
                        <div>
                          <span className={styles.userName}>
                            {user.full_name || user.username || 'User'}
                          </span>
                          {isMe && <span className={styles.youBadge}>Kamu</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      {user.streak_days > 0 ? (
                        <span>🔥 {user.streak_days} days</span>
                      ) : (
                        <span style={{ color: 'var(--dark-3)' }}>-</span>
                      )}
                    </td>
                    <td>
                      <span className={styles.valHigh}>📝 {user.completed_tasks}</span> tasks
                    </td>
                    <td>
                      <span className={styles.pointBadge}>
                        ⭐ {displayPts}
                      </span>
                    </td>
                  </tr>
                )
              })}
              
              {list.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--dark-3)' }}>
                    Tidak ada data yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
