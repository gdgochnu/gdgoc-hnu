export default function TasksLoading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div
        className="header-nav"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '65px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="skeleton skeleton-avatar" style={{ width: '36px', height: '36px' }} />
          <div className="skeleton skeleton-title" style={{ width: '140px', height: '20px', marginBottom: 0 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="skeleton skeleton-avatar" style={{ width: '36px', height: '36px' }} />
        </div>
      </div>

      <main
        style={{
          padding: '2rem 1.5rem',
          maxWidth: '1440px',
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.75rem',
        }}
      >
        {/* Header Skeleton */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div className="skeleton" style={{ width: '110px', height: '22px', borderRadius: '999px' }} />
            <div className="skeleton skeleton-title" style={{ width: '320px', height: '32px', marginBottom: 0 }} />
            <div className="skeleton skeleton-text" style={{ width: '450px', maxWidth: '100%', height: '14px', marginBottom: 0 }} />
          </div>
          <div className="skeleton" style={{ width: '130px', height: '40px', borderRadius: 'var(--radius-md)' }} />
        </div>

        {/* Filter Bar Skeleton */}
        <div
          className="skeleton-card"
          style={{
            padding: '1rem 1.25rem',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div className="skeleton" style={{ flex: 1, minWidth: '220px', height: '40px', borderRadius: 'var(--radius-md)' }} />
          <div className="skeleton" style={{ width: '180px', height: '40px', borderRadius: 'var(--radius-md)' }} />
          <div className="skeleton" style={{ width: '140px', height: '40px', borderRadius: 'var(--radius-md)' }} />
        </div>

        {/* 4 Kanban Columns Skeleton */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
            alignItems: 'flex-start',
          }}
        >
          {[1, 2, 3, 4].map((colIdx) => (
            <div
              key={colIdx}
              className="skeleton-card"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                minHeight: '480px',
              }}
            >
              {/* Column Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="skeleton skeleton-title" style={{ width: '100px', height: '18px', marginBottom: 0 }} />
                <div className="skeleton" style={{ width: '28px', height: '20px', borderRadius: '999px' }} />
              </div>

              {/* Task Cards in Column */}
              {[1, 2, 3].map((cardIdx) => (
                <div
                  key={cardIdx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="skeleton" style={{ width: '60px', height: '18px', borderRadius: '999px' }} />
                    <div className="skeleton skeleton-avatar" style={{ width: '22px', height: '22px' }} />
                  </div>
                  <div className="skeleton skeleton-title" style={{ width: '85%', height: '16px', marginBottom: 0 }} />
                  <div className="skeleton skeleton-text" style={{ width: '100%', height: '12px', marginBottom: 0 }} />
                  <div className="skeleton skeleton-text" style={{ width: '50%', height: '12px', marginBottom: 0 }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
