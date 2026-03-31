'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div style={{ width: "100%", maxWidth: 380, margin: "0 16px" }}>
      <div style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        boxShadow: "0 16px 48px rgba(0,0,0,0.10)",
        padding: "36px 32px",
        border: "1px solid rgba(0,0,0,0.06)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: "#EFF6FF",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "#1D1D1F", margin: 0, letterSpacing: "-0.3px" }}>
            <span style={{ color: "#2563EB" }}>Tech</span>Ops
          </h1>
          <p style={{ fontSize: 13, color: "#AEAEB2", margin: "4px 0 0" }}>
            Gestion de maintenance hôtelière
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label htmlFor="email" style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#1D1D1F", marginBottom: 6 }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.fr"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.10)",
                backgroundColor: "#F5F5F7",
                fontSize: 14,
                color: "#1D1D1F",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label htmlFor="password" style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#1D1D1F", marginBottom: 6 }}>
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.10)",
                backgroundColor: "#F5F5F7",
                fontSize: 14,
                color: "#1D1D1F",
                outline: "none",
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: "10px 14px",
              borderRadius: 12,
              backgroundColor: "#FFF1F0",
              border: "1px solid rgba(255,59,48,0.15)",
              fontSize: 13,
              color: "#FF3B30",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "11px 0",
              borderRadius: 12,
              border: "none",
              backgroundColor: loading ? "#AEAEB2" : "#2563EB",
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 12px rgba(0,122,255,0.3)",
              marginTop: 4,
              transition: "background-color 0.15s",
            }}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  )
}
