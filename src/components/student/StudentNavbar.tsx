'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  GraduationCap,
  QrCode,
  LayoutDashboard,
  BookOpen,
  Calendar,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  User,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface StudentNavbarProps {
  studentName?: string | null;
  studentQr?: string | null;
  teamRole?: string | null;
  avatarUrl?: string | null;
}

export function StudentNavbar({
  studentName,
  studentQr,
  teamRole,
  avatarUrl,
}: StudentNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const supabase = createClient();

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await supabase.auth.signOut();
      router.push('/student');
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsSigningOut(false);
    }
  };

  const navLinks = [
    {
      label: 'Dashboard',
      href: '/student/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/student/dashboard',
    },
    {
      label: 'My QR Pass',
      href: '/student/my-qr',
      icon: QrCode,
      active: pathname === '/student/my-qr',
    },
  ];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        background: 'rgba(7, 11, 20, 0.88)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link
            href="/student/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              textDecoration: 'none',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.2) 0%, rgba(52, 168, 83, 0.2) 100%)',
                border: '1px solid rgba(66, 133, 244, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GraduationCap size={22} color="#60A5FA" />
            </div>
            <div>
              <div
                style={{
                  fontSize: '1.02rem',
                  fontWeight: 900,
                  color: '#FFFFFF',
                  letterSpacing: '-0.02em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>GDGoC HNU</span>
                <span
                  style={{
                    background: 'linear-gradient(135deg, #60A5FA 0%, #34D399 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Student Portal
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>
                Student Operating Space
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '0.5rem',
            }}
            className="md:flex"
          >
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.9rem',
                    borderRadius: '8px',
                    fontSize: '0.86rem',
                    fontWeight: item.active ? 700 : 500,
                    color: item.active ? '#60A5FA' : '#94A3B8',
                    background: item.active ? 'rgba(66, 133, 244, 0.12)' : 'transparent',
                    border: item.active ? '1px solid rgba(66, 133, 244, 0.25)' : '1px solid transparent',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Section: Team Bridge / Profile / Sign Out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Dual-Role Chapter OS Quick Link */}
          {teamRole && (
            <Link
              href="/dashboard"
              title="Switch to GDGoC Internal Chapter OS"
              style={{
                display: 'none',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.42rem 0.8rem',
                borderRadius: '9999px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34D399',
                fontSize: '0.78rem',
                fontWeight: 700,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
              className="sm:flex"
            >
              <ShieldCheck size={14} />
              <span>Chapter OS</span>
              <ExternalLink size={12} style={{ opacity: 0.7 }} />
            </Link>
          )}

          {/* Student QR Badge */}
          {studentQr && (
            <Link
              href="/student/my-qr"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.42rem 0.75rem',
                borderRadius: '8px',
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#CBD5E1',
                fontSize: '0.78rem',
                fontWeight: 700,
                textDecoration: 'none',
                fontFamily: 'monospace',
              }}
            >
              <QrCode size={14} color="#60A5FA" />
              <span>{studentQr}</span>
            </Link>
          )}

          {/* Student Name / Avatar Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.35rem 0.6rem',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={studentName || 'Student'}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                }}
              >
                {studentName ? studentName.charAt(0).toUpperCase() : <User size={14} />}
              </div>
            )}
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#E2E8F0',
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'none',
              }}
              className="sm:inline"
            >
              {studentName || 'Student'}
            </span>
          </div>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            title="Sign Out"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#F87171',
              padding: '0.45rem',
              borderRadius: '8px',
              cursor: isSigningOut ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            <LogOut size={16} />
          </button>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              padding: '0.45rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            className="md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          style={{
            background: 'rgba(11, 15, 25, 0.98)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '1rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
          className="md:hidden"
        >
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.92rem',
                  fontWeight: item.active ? 700 : 500,
                  color: item.active ? '#60A5FA' : '#E2E8F0',
                  background: item.active ? 'rgba(66, 133, 244, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  textDecoration: 'none',
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {teamRole && (
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#34D399',
                fontSize: '0.92rem',
                fontWeight: 700,
                textDecoration: 'none',
                marginTop: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ShieldCheck size={18} />
                <span>Switch to Chapter OS</span>
              </div>
              <ExternalLink size={16} />
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
