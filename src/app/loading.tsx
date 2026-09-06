export default function RootLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'var(--bg-main)',
      }}
    >
      <div
        className="glass-panel"
        style={{
          padding: '2.5rem 3rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* Animated Google 4-Color Ring Loader */}
        <div
          style={{
            position: 'relative',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '3px solid transparent',
              borderTopColor: 'var(--google-blue)',
              borderRightColor: 'var(--google-red)',
              borderBottomColor: 'var(--google-yellow)',
              borderLeftColor: 'var(--google-green)',
              animation: 'spin 0.9s cubic-bezier(0.55, 0.15, 0.45, 0.85) infinite',
            }}
          />
          <span
            style={{
              fontWeight: 800,
              fontSize: '1rem',
              background: 'linear-gradient(135deg, #4285F4, #34A853)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            &lt;&gt;
          </span>
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            GDGoC HNU OS
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            جاري تحميل مساحة العمل...
          </div>
        </div>

        {/* Shimmer Bar */}
        <div
          className="skeleton"
          style={{
            width: '80%',
            height: '4px',
            borderRadius: '999px',
            marginTop: '0.5rem',
          }}
        />
      </div>
    </div>
  );
}
