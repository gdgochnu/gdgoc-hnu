'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Link from 'next/link';
import {
  QrCode,
  Camera,
  Keyboard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Search,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Sparkles,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronRight,
  User,
  Mail,
  Phone,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  Calendar,
  AlertTriangle,
  X,
  Loader2,
  Check,
  Layers,
} from 'lucide-react';
import {
  SelectableSession,
  AttendanceStudentSummary,
  RecentCheckinItem,
  recordStudentAttendance,
  searchSessionAttendees,
  getRecentSessionCheckins,
} from '@/app/student-portal/admin/attendance/scan/actions';

interface AttendanceScannerClientProps {
  sessions: SelectableSession[];
  officerName: string;
  officerRole: string;
  canScan: boolean;
  initialType?: 'course' | 'workshop';
  initialSessionId?: string;
  initialParentId?: string;
}

export function AttendanceScannerClient({
  sessions,
  officerName,
  officerRole,
  canScan,
  initialType,
  initialSessionId,
  initialParentId,
}: AttendanceScannerClientProps) {
  // If initialSessionId is provided, find what type it is
  const matchingSession = initialSessionId ? sessions.find((s) => s.id === initialSessionId) : null;
  const parentMatchingSession = initialParentId ? sessions.find((s) => s.parent_id === initialParentId) : null;

  const resolvedInitialType: 'course' | 'workshop' =
    matchingSession?.target_type ||
    parentMatchingSession?.target_type ||
    initialType ||
    'course';

  // Target Type & Session Selection
  const [targetType, setTargetType] = useState<'course' | 'workshop'>(resolvedInitialType);
  const availableSessions = sessions.filter((s) => s.target_type === targetType);

  const resolvedInitialSessionId: string =
    matchingSession?.id ||
    (initialType && parentMatchingSession ? parentMatchingSession.id : '') ||
    (availableSessions.length > 0 ? availableSessions[0].id : '');

  const [selectedSessionId, setSelectedSessionId] = useState<string>(resolvedInitialSessionId);

  // When targetType switches, ensure a valid selected session
  useEffect(() => {
    const subset = sessions.filter((s) => s.target_type === targetType);
    if (subset.length > 0 && !subset.some((s) => s.id === selectedSessionId)) {
      setSelectedSessionId(subset[0].id);
    }
  }, [targetType, sessions]);

  const activeSession = sessions.find((s) => s.id === selectedSessionId) || availableSessions[0] || null;

  // Scanner Modes
  const [activeTab, setActiveTab] = useState<'camera' | 'manual' | 'search'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Feedback State
  const [lastResult, setLastResult] = useState<{
    type: 'success' | 'warning' | 'error';
    student?: AttendanceStudentSummary;
    message: string;
    alreadyCheckedIn?: boolean;
  } | null>(null);

  // Recent Check-ins Feed
  const [recentCheckins, setRecentCheckins] = useState<RecentCheckinItem[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);

  // Walk-in Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AttendanceStudentSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Live Stats for Active Session
  const [checkedInCount, setCheckedInCount] = useState(activeSession?.checked_in_count || 0);

  useEffect(() => {
    if (activeSession) {
      setCheckedInCount(activeSession.checked_in_count);
      loadRecentCheckins(activeSession.target_type, activeSession.id);
    }
  }, [selectedSessionId]);

  const loadRecentCheckins = async (tType: 'course' | 'workshop', sId: string) => {
    try {
      setIsLoadingRecent(true);
      const res = await getRecentSessionCheckins(tType, sId);
      if (res.success) {
        setRecentCheckins(res.checkins);
      }
    } catch {} finally {
      setIsLoadingRecent(false);
    }
  };

  // Audio Feedback Synthesizer using Web Audio API
  const playAudioBeep = (type: 'success' | 'warning' | 'error') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'success') {
        // High, bright double chime
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, ctx.currentTime);
        gain1.gain.setValueAtTime(0.3, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.15);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1760, ctx.currentTime + 0.08);
        gain2.gain.setValueAtTime(0.35, ctx.currentTime + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.08);
        osc2.stop(ctx.currentTime + 0.3);
      } else if (type === 'warning') {
        // Double middle tone (already checked in)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        // Low error buzz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {}
  };

  // Camera Scanner Reference
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Initialize and Stop Html5Qrcode
  useEffect(() => {
    if (activeTab !== 'camera' || !selectedSessionId) {
      stopCamera();
      return;
    }

    let isSubscribed = true;

    const startScanner = async () => {
      try {
        setCameraError(null);
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode('qr-reader-attendance-element');
        }

        const scanner = scannerRef.current;
        if (!scanner.isScanning) {
          await scanner.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              if (isSubscribed) {
                handleScannedCode(decodedText, 'qr');
              }
            },
            () => {} // suppress frame errors
          );
          if (isSubscribed) {
            setIsCameraActive(true);
          }
        }
      } catch (err: any) {
        console.error('Camera scanner init error:', err);
        if (isSubscribed) {
          setIsCameraActive(false);
          setCameraError(err.message || 'Camera permission denied or camera not found.');
        }
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 200);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
      stopCamera();
    };
  }, [activeTab, selectedSessionId]);

  const stopCamera = async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
    } catch {}
    setIsCameraActive(false);
  };

  // Process Scanned Code
  const handleScannedCode = async (code: string, method: 'qr' | 'manual' = 'qr') => {
    if (isProcessing || !activeSession) return;

    try {
      setIsProcessing(true);
      const res = await recordStudentAttendance({
        targetType: activeSession.target_type,
        sessionId: activeSession.id,
        qrCodeOrQuery: code,
        method,
      });

      if (res.success && res.student) {
        playAudioBeep('success');
        setLastResult({
          type: 'success',
          student: res.student,
          message: res.message || `Checked in ${res.student.full_name_en}`,
        });
        setCheckedInCount((c) => c + 1);

        // Prepend to recent check-ins
        setRecentCheckins((prev) => [
          {
            id: 'temp-' + Date.now(),
            check_in_time: res.checkInTime || new Date().toISOString(),
            method,
            student: {
              id: res.student!.id,
              full_name_en: res.student!.full_name_en,
              full_name_ar: res.student!.full_name_ar,
              email: res.student!.email,
              qr_code: res.student!.qr_code,
              avatar_url: res.student!.avatar_url,
              faculty: res.student!.faculty,
            },
            checked_in_by_name: officerName,
          },
          ...prev.slice(0, 9),
        ]);
      } else if (res.alreadyCheckedIn && res.student) {
        playAudioBeep('warning');
        setLastResult({
          type: 'warning',
          student: res.student,
          message: `Already checked in at ${new Date(res.checkInTime || '').toLocaleTimeString()} by ${res.checkedInBy}`,
          alreadyCheckedIn: true,
        });
      } else {
        playAudioBeep('error');
        setLastResult({
          type: 'error',
          message: res.error || 'Attendance verification failed.',
        });
      }
    } catch (err: any) {
      playAudioBeep('error');
      setLastResult({
        type: 'error',
        message: err.message || 'An unexpected error occurred.',
      });
    } finally {
      // Pause slightly so rapid camera frames don't double trigger
      setTimeout(() => {
        setIsProcessing(false);
      }, 1400);
    }
  };

  // Manual Keyboard Entry
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScannedCode(manualCode.trim(), 'manual');
    setManualCode('');
  };

  // Walk-in Search Handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !activeSession) return;

    try {
      setIsSearching(true);
      const res = await searchSessionAttendees(
        activeSession.target_type,
        activeSession.id,
        searchQuery.trim()
      );
      if (res.success) {
        setSearchResults(res.students);
      }
    } catch {} finally {
      setIsSearching(false);
    }
  };

  const totalSeats = activeSession?.enrolled_or_registered_count || 0;
  const attendanceRate = totalSeats > 0 ? Math.min(Math.round((checkedInCount / totalSeats) * 100), 100) : 0;

  return (
    <div
      style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '2rem 1.5rem 4rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
      }}
    >
      {/* 1. Header & Officer Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#94A3B8' }}>
            <Link
              href="/student-portal/admin/courses"
              style={{ color: '#60A5FA', textDecoration: 'none', fontWeight: 600 }}
            >
              Portal Admin
            </Link>
            <span>/</span>
            <span style={{ color: '#F8FAFC', fontWeight: 700 }}>Mobile Attendance Scanner</span>
            {activeSession && (
              <Link
                href={
                  activeSession.target_type === 'course'
                    ? `/student-portal/admin/courses/${activeSession.parent_id}/sessions`
                    : `/student-portal/admin/workshops/${activeSession.parent_id}/sessions`
                }
                style={{
                  marginLeft: '0.5rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: '#60A5FA',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  background: 'rgba(66, 133, 244, 0.12)',
                  border: '1px solid rgba(66, 133, 244, 0.25)',
                }}
              >
                <ArrowLeft size={13} />
                <span>Return to {activeSession.parent_title}</span>
              </Link>
            )}
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#FFFFFF', margin: '0.3rem 0 0 0', letterSpacing: '-0.5px' }}>
            Unified QR Attendance Scanner
          </h1>
        </div>

        {/* Officer Badge & Sound Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.82rem',
              color: '#CBD5E1',
            }}
          >
            <ShieldCheck size={16} style={{ color: '#34A853' }} />
            <span>Officer: <strong style={{ color: '#FFFFFF' }}>{officerName}</strong> ({officerRole})</span>
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '10px',
              background: soundEnabled ? 'rgba(52, 168, 83, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${soundEnabled ? 'rgba(52, 168, 83, 0.35)' : 'rgba(255, 255, 255, 0.1)'}`,
              color: soundEnabled ? '#34D399' : '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
            title={soundEnabled ? 'Sound is on' : 'Sound is muted'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{soundEnabled ? 'Beep On' : 'Muted'}</span>
          </button>
        </div>
      </div>

      {/* 2. Session Target Selector & Live Capacity Monitor */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(15, 23, 42, 0.9) 100%)',
          padding: '1.75rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Target Type Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>
              Target Event:
            </span>
            <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.35)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button
                type="button"
                onClick={() => setTargetType('course')}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  background: targetType === 'course' ? '#4285F4' : 'transparent',
                  color: targetType === 'course' ? '#FFFFFF' : '#94A3B8',
                  transition: 'all 0.15s ease',
                }}
              >
                Course Sessions
              </button>
              <button
                type="button"
                onClick={() => setTargetType('workshop')}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  background: targetType === 'workshop' ? '#34A853' : 'transparent',
                  color: targetType === 'workshop' ? '#FFFFFF' : '#94A3B8',
                  transition: 'all 0.15s ease',
                }}
              >
                Workshop Sessions
              </button>
            </div>
          </div>

          {/* Live Attendance Counter */}
          {activeSession && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.74rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>
                  Attendance Rate
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34D399' }}>
                  {checkedInCount} / {totalSeats} ({attendanceRate}%)
                </div>
              </div>

              {/* Progress Ring / Bar */}
              <div
                style={{
                  width: '80px',
                  height: '8px',
                  borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${attendanceRate}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #4285F4, #34A853)',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Session Dropdown Picker */}
        {availableSessions.length === 0 ? (
          <div
            style={{
              padding: '1rem',
              borderRadius: '10px',
              background: 'rgba(234, 67, 53, 0.1)',
              border: '1px solid rgba(234, 67, 53, 0.25)',
              color: '#F87171',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            No active {targetType === 'course' ? 'courses' : 'workshops'} found. Please schedule sessions first.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.78rem', color: '#CBD5E1', fontWeight: 700, textTransform: 'uppercase' }}>
              Select Active Session to Record Attendance:
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.85rem 1.1rem',
                borderRadius: '12px',
                background: '#0B1120',
                border: '1.5px solid rgba(66, 133, 244, 0.4)',
                color: '#FFFFFF',
                fontSize: '0.94rem',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {availableSessions.map((s) => (
                <option key={s.id} value={s.id} style={{ background: '#0B1120', color: '#FFFFFF' }}>
                  {s.parent_title} — Session {s.session_number}: {s.title} ({new Date(s.session_date).toLocaleDateString()} {s.start_time.slice(0, 5)} • {s.type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3. Main Scanning Area & Mode Tabs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: '1.5rem',
        }}
      >
        {/* Left Column: Scanning Console */}
        <div
          className="glass-panel"
          style={{
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(15, 23, 42, 0.75)',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* Mode Switcher Tabs */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              style={{
                flex: 1,
                padding: '0.65rem 0.5rem',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'camera' ? '#4285F4' : 'transparent',
                color: activeTab === 'camera' ? '#FFFFFF' : '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                transition: 'all 0.15s ease',
              }}
            >
              <Camera size={16} />
              <span>Camera Scanner</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              style={{
                flex: 1,
                padding: '0.65rem 0.5rem',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'manual' ? '#4285F4' : 'transparent',
                color: activeTab === 'manual' ? '#FFFFFF' : '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                transition: 'all 0.15s ease',
              }}
            >
              <Keyboard size={16} />
              <span>Manual Entry</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('search')}
              style={{
                flex: 1,
                padding: '0.65rem 0.5rem',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'search' ? '#4285F4' : 'transparent',
                color: activeTab === 'search' ? '#FFFFFF' : '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                transition: 'all 0.15s ease',
              }}
            >
              <Search size={16} />
              <span>Walk-in Search</span>
            </button>
          </div>

          {/* TAB 1: Live Camera Scanner */}
          {activeTab === 'camera' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <div
                style={{
                  width: '100%',
                  maxWidth: '420px',
                  aspectRatio: '1 / 1',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#000000',
                  border: '2px dashed rgba(66, 133, 244, 0.4)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Scanner Target Container */}
                <div id="qr-reader-attendance-element" style={{ width: '100%', height: '100%' }} />

                {/* Processing Overlay */}
                {isProcessing && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0, 0, 0, 0.65)',
                      backdropFilter: 'blur(4px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.6rem',
                      zIndex: 20,
                    }}
                  >
                    <Loader2 size={36} className="animate-spin" style={{ color: '#4285F4' }} />
                    <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '0.92rem' }}>
                      Verifying Attendance...
                    </span>
                  </div>
                )}
              </div>

              {cameraError && (
                <div
                  style={{
                    padding: '0.85rem 1.25rem',
                    borderRadius: '10px',
                    background: 'rgba(234, 67, 53, 0.15)',
                    border: '1px solid rgba(234, 67, 53, 0.35)',
                    color: '#F87171',
                    fontSize: '0.84rem',
                    textAlign: 'center',
                    maxWidth: '420px',
                  }}
                >
                  <AlertCircle size={16} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />
                  {cameraError} — Please switch to <strong>Manual Entry</strong> or <strong>Walk-in Search</strong>.
                </div>
              )}

              <p style={{ color: '#94A3B8', fontSize: '0.82rem', textAlign: 'center', margin: 0 }}>
                Point student's Portal QR code inside the viewfinder. Beep confirmation will sound instantly.
              </p>
            </div>
          )}

          {/* TAB 2: Manual QR Code Entry */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1' }}>
                  Student QR Code or Email or National ID:
                </label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="text"
                    placeholder="e.g. STU-2026-..., WS-REG-..., or student email"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    autoFocus
                    style={{
                      flex: 1,
                      padding: '0.85rem 1.1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      fontSize: '0.92rem',
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || !manualCode.trim()}
                    style={{
                      padding: '0.85rem 1.4rem',
                      borderRadius: '10px',
                      background: '#4285F4',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      boxShadow: '0 4px 14px rgba(66, 133, 244, 0.4)',
                    }}
                  >
                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Check In
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#94A3B8', lineHeight: 1.5 }}>
                Supports USB barcode scanners, rapid keyboard input, and direct pasting of Student Portal QR tokens.
              </div>
            </form>
          )}

          {/* TAB 3: Walk-in Manual Search */}
          {activeTab === 'search' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem' }}>
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                  }}
                >
                  <Search size={16} style={{ color: '#94A3B8' }} />
                  <input
                    type="text"
                    placeholder="Search student by English/Arabic name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '0.86rem',
                      outline: 'none',
                      width: '100%',
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: '10px',
                    background: '#4285F4',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
                </button>
              </form>

              {/* Search Results List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '340px', overflowY: 'auto' }}>
                {searchResults.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.9rem' }}>
                        {s.full_name_en} {s.full_name_ar ? `(${s.full_name_ar})` : ''}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#94A3B8', marginTop: '0.15rem' }}>
                        {s.faculty || 'Helwan University'} • {s.email}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: s.is_enrolled ? '#34D399' : '#FBBF24', marginTop: '0.15rem' }}>
                        {s.is_enrolled ? 'Enrolled in Course / Workshop' : `Status: ${s.enrollment_status}`}
                      </div>
                    </div>

                    {s.is_checked_in ? (
                      <span
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          background: 'rgba(52, 168, 83, 0.2)',
                          color: '#34D399',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                        }}
                      >
                        Checked In
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleScannedCode(s.qr_code || s.id, 'manual')}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          background: '#34A853',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        Record Present
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Realtime Last Scanned Result Banner */}
          {lastResult && (
            <div
              style={{
                marginTop: 'auto',
                padding: '1.25rem',
                borderRadius: '14px',
                background:
                  lastResult.type === 'success'
                    ? 'rgba(52, 168, 83, 0.15)'
                    : lastResult.type === 'warning'
                    ? 'rgba(251, 188, 4, 0.15)'
                    : 'rgba(234, 67, 53, 0.15)',
                border: `1.5px solid ${
                  lastResult.type === 'success'
                    ? 'rgba(52, 168, 83, 0.4)'
                    : lastResult.type === 'warning'
                    ? 'rgba(251, 188, 4, 0.4)'
                    : 'rgba(234, 67, 53, 0.4)'
                }`,
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              {lastResult.type === 'success' ? (
                <CheckCircle2 size={32} style={{ color: '#34D399', flexShrink: 0 }} />
              ) : lastResult.type === 'warning' ? (
                <AlertTriangle size={32} style={{ color: '#FBBF24', flexShrink: 0 }} />
              ) : (
                <AlertCircle size={32} style={{ color: '#F87171', flexShrink: 0 }} />
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.98rem',
                    fontWeight: 800,
                    color:
                      lastResult.type === 'success'
                        ? '#34D399'
                        : lastResult.type === 'warning'
                        ? '#FBBF24'
                        : '#F87171',
                  }}
                >
                  {lastResult.type === 'success'
                    ? 'Attendance Confirmed'
                    : lastResult.type === 'warning'
                    ? 'Already Scanned (Duplicate Prevented)'
                    : 'Verification Failed'}
                </div>

                <div style={{ fontSize: '0.84rem', color: '#CBD5E1', marginTop: '0.2rem' }}>
                  {lastResult.message}
                </div>

                {lastResult.student && (
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                    {lastResult.student.faculty || 'Helwan University'} • {lastResult.student.email}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Recent Check-ins Feed */}
        <div
          className="glass-panel"
          style={{
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(15, 23, 42, 0.75)',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>
              <Clock size={16} style={{ color: '#60A5FA' }} />
              <span>Recent Scans ({recentCheckins.length})</span>
            </div>

            {activeSession && (
              <button
                type="button"
                onClick={() => loadRecentCheckins(activeSession.target_type, activeSession.id)}
                disabled={isLoadingRecent}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.76rem',
                }}
              >
                <RefreshCw size={13} className={isLoadingRecent ? 'animate-spin' : ''} />
                Refresh
              </button>
            )}
          </div>

          {recentCheckins.length === 0 ? (
            <div
              style={{
                padding: '3rem 1.5rem',
                textAlign: 'center',
                color: '#94A3B8',
                fontSize: '0.86rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Users size={32} style={{ color: '#475569' }} />
              <span>No check-ins recorded yet for this session.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', overflowY: 'auto', maxHeight: '520px' }}>
              {recentCheckins.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'rgba(52, 168, 83, 0.15)',
                      border: '1.5px solid #34A853',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {item.student.avatar_url ? (
                      <img src={item.student.avatar_url} alt={item.student.full_name_en} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      item.student.full_name_en.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.student.full_name_en}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                      {new Date(item.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • via {item.method.toUpperCase()}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      background: 'rgba(52, 168, 83, 0.15)',
                      color: '#34D399',
                      fontWeight: 800,
                    }}
                  >
                    Present
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
