'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  recordQrCheckin,
  searchEventAttendees,
  recordManualCheckin,
  registerAndCheckInWalkin,
} from '@/app/events/actions';
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
  UserPlus,
  Sparkles,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronRight,
  User,
  Mail,
  Phone,
  ArrowRight,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

interface RecentCheckinItem {
  id: string;
  check_in_time: string;
  method: string;
  registration?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string | null;
    qr_code: string;
  } | null;
  checked_in_by_profile?: {
    full_name: string;
    role: string;
  } | null;
}

interface SearchResultItem {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  status: string;
  qr_code: string;
  isCheckedIn: boolean;
  checkInTime?: string | null;
  checkInMethod?: string | null;
}

interface EventCheckinScannerProps {
  eventId: string;
  eventTitle: string;
  initialStats: {
    totalRegistered: number;
    totalCheckedIn: number;
    attendanceRate: number;
    recentCheckins: RecentCheckinItem[];
  };
  accessReason: string;
  officerName: string;
}

export function EventCheckinScanner({
  eventId,
  eventTitle,
  initialStats,
  accessReason,
  officerName,
}: EventCheckinScannerProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual' | 'walkin'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Search & Walk-in state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [walkinFullName, setWalkinFullName] = useState('');
  const [walkinEmail, setWalkinEmail] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinError, setWalkinError] = useState<string | null>(null);

  // Stats & Streams
  const [stats, setStats] = useState(initialStats);
  const [lastResult, setLastResult] = useState<{
    type: 'success' | 'duplicate' | 'error';
    message: string;
    attendee?: any;
    checkInTime?: string;
  } | null>(null);

  // Camera scanner state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-container';

  // Play audio beep using Web Audio API
  const playBeep = (type: 'success' | 'error' | 'duplicate') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'success') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      console.warn('Audio playback not supported:', e);
    }
  };

  // Process a scanned QR code
  const handleProcessScan = async (qrString: string) => {
    if (isProcessing) return;
    const clean = qrString.trim();
    if (!clean) return;

    setIsProcessing(true);
    try {
      const res = await recordQrCheckin({
        eventId,
        qrCode: clean,
      });

      if (res.success && res.attendee) {
        playBeep('success');
        setLastResult({
          type: 'success',
          message: 'QR Check-in Confirmed!',
          attendee: res.attendee,
          checkInTime: res.checkInTime,
        });

        // Update local stats
        setStats(prev => {
          const newCheckedIn = prev.totalCheckedIn + 1;
          const newRate = prev.totalRegistered > 0 ? Math.round((newCheckedIn / prev.totalRegistered) * 100) : 100;
          const newRecent: RecentCheckinItem = {
            id: res.attendance?.id || `att-${Date.now()}`,
            check_in_time: res.checkInTime || new Date().toISOString(),
            method: 'qr',
            registration: res.attendee,
            checked_in_by_profile: {
              full_name: officerName,
              role: 'Officer',
            },
          };
          return {
            ...prev,
            totalCheckedIn: newCheckedIn,
            attendanceRate: newRate,
            recentCheckins: [newRecent, ...prev.recentCheckins.slice(0, 19)],
          };
        });

        setManualCode('');
      } else if (res.code === 'DUPLICATE_CHECKIN') {
        playBeep('duplicate');
        setLastResult({
          type: 'duplicate',
          message: 'Already Checked In!',
          attendee: res.attendee,
          checkInTime: res.checkInTime,
        });
      } else {
        playBeep('error');
        setLastResult({
          type: 'error',
          message: res.error || 'Check-in failed.',
          attendee: res.attendee,
        });
      }
    } catch (err: any) {
      playBeep('error');
      setLastResult({
        type: 'error',
        message: err?.message || 'Check-in failed.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Search attendees handler
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchEventAttendees({
          eventId,
          query: trimmed,
        });
        if (res.success && res.results) {
          setSearchResults(res.results);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, eventId]);

  // Handle Manual Check-in for Search Result
  const handleManualCheckinAttendee = async (regId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const res = await recordManualCheckin({
        eventId,
        registrationId: regId,
      });

      if (res.success && res.attendee) {
        playBeep('success');
        setLastResult({
          type: 'success',
          message: 'Manual Check-in Confirmed!',
          attendee: res.attendee,
          checkInTime: res.checkInTime,
        });

        // Update search results list
        setSearchResults(prev => prev.map(r => r.id === regId ? {
          ...r,
          isCheckedIn: true,
          checkInTime: res.checkInTime,
          checkInMethod: 'manual',
        } : r));

        // Update stats
        setStats(prev => {
          const newCheckedIn = prev.totalCheckedIn + 1;
          const newRate = prev.totalRegistered > 0 ? Math.round((newCheckedIn / prev.totalRegistered) * 100) : 100;
          const newRecent: RecentCheckinItem = {
            id: res.attendance?.id || `att-${Date.now()}`,
            check_in_time: res.checkInTime || new Date().toISOString(),
            method: 'manual',
            registration: res.attendee,
            checked_in_by_profile: {
              full_name: officerName,
              role: 'Officer',
            },
          };
          return {
            ...prev,
            totalCheckedIn: newCheckedIn,
            attendanceRate: newRate,
            recentCheckins: [newRecent, ...prev.recentCheckins.slice(0, 19)],
          };
        });
      } else if (res.code === 'DUPLICATE_CHECKIN') {
        playBeep('duplicate');
        setLastResult({
          type: 'duplicate',
          message: 'Already Checked In!',
          attendee: res.attendee,
          checkInTime: res.checkInTime,
        });
      } else {
        playBeep('error');
        setLastResult({
          type: 'error',
          message: res.error || 'Manual check-in failed.',
          attendee: res.attendee,
        });
      }
    } catch (err: any) {
      playBeep('error');
      setLastResult({
        type: 'error',
        message: err?.message || 'Manual check-in failed.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Walk-in Registration & Check-in Submission
  const handleWalkinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalkinError(null);
    setIsProcessing(true);

    try {
      const res = await registerAndCheckInWalkin({
        eventId,
        fullName: walkinFullName,
        email: walkinEmail,
        phone: walkinPhone,
      });

      if (res.success && res.attendee) {
        playBeep('success');
        setLastResult({
          type: 'success',
          message: 'Walk-in Registered & Checked In!',
          attendee: res.attendee,
          checkInTime: res.checkInTime,
        });

        // Update stats (both registered and checkedIn increase by 1)
        setStats(prev => {
          const newReg = prev.totalRegistered + 1;
          const newCheckedIn = prev.totalCheckedIn + 1;
          const newRate = Math.round((newCheckedIn / newReg) * 100);
          const newRecent: RecentCheckinItem = {
            id: res.attendance?.id || `att-${Date.now()}`,
            check_in_time: res.checkInTime || new Date().toISOString(),
            method: 'manual',
            registration: res.attendee,
            checked_in_by_profile: {
              full_name: officerName,
              role: 'Officer',
            },
          };
          return {
            ...prev,
            totalRegistered: newReg,
            totalCheckedIn: newCheckedIn,
            attendanceRate: newRate,
            recentCheckins: [newRecent, ...prev.recentCheckins.slice(0, 19)],
          };
        });

        // Reset form & close modal
        setWalkinFullName('');
        setWalkinEmail('');
        setWalkinPhone('');
        setShowWalkinModal(false);
      } else {
        playBeep('error');
        setWalkinError(res.error || 'Failed to register walk-in attendee.');
      }
    } catch (err: any) {
      playBeep('error');
      setWalkinError(err?.message || 'Failed to register walk-in.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Start Camera Scanner
  const startCamera = async () => {
    setCameraError(null);
    try {
      const qrScanner = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleProcessScan(decodedText);
        },
        () => {}
      );
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Failed to start camera scanner:', err);
      setCameraError(err?.message || 'Unable to access camera. Please allow camera permissions or use manual scanner.');
      setIsCameraActive(false);
    }
  };

  // Stop Camera Scanner
  const stopCamera = async () => {
    if (html5QrCodeRef.current && isCameraActive) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping camera:', e);
      }
      setIsCameraActive(false);
    }
  };

  // Cleanup scanner on unmount or tab switch
  useEffect(() => {
    if (activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [activeTab]);

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessScan(manualCode);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header & Officer Duty Info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.65rem',
              borderRadius: '20px',
              background: 'rgba(52, 168, 83, 0.15)',
              color: '#4ADE80',
              fontSize: '0.78rem',
              fontWeight: 700,
              border: '1px solid rgba(52, 168, 83, 0.3)',
            }}>
              <ShieldCheck size={13} />
              Check-in Access Authorized
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
              Mode: <strong>{accessReason.replace('_', ' ').toUpperCase()}</strong>
            </span>
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
            {eventTitle}
          </h1>
          <div style={{ fontSize: '0.86rem', color: '#94A3B8', marginTop: '0.2rem' }}>
            Officer on Duty: <strong style={{ color: '#F1F5F9' }}>{officerName}</strong>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setShowWalkinModal(true)}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              fontSize: '0.84rem',
              fontWeight: 700,
              borderRadius: '10px',
            }}
          >
            <UserPlus size={16} />
            <span>+ Add Walk-in</span>
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.9rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: soundEnabled ? '#60A5FA' : '#94A3B8',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{soundEnabled ? 'Chime ON' : 'Muted'}</span>
          </button>

          <Link
            href={`/events/${eventId}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              background: 'rgba(66, 133, 244, 0.15)',
              border: '1px solid rgba(66, 133, 244, 0.3)',
              color: '#60A5FA',
              fontSize: '0.84rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <span>Back to Event</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* Live KPIs Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {/* Total Registered */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '14px' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 700, marginBottom: '0.35rem' }}>
            Total Registered
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#FFFFFF' }}>
            {stats.totalRegistered}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.2rem' }}>Confirmed Passes</div>
        </div>

        {/* Total Checked In */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '14px' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 700, marginBottom: '0.35rem' }}>
            Checked In
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#4ADE80' }}>
            {stats.totalCheckedIn}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#4ADE80', marginTop: '0.2rem' }}>Verified Attendees</div>
        </div>

        {/* Attendance Rate */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '14px' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 700, marginBottom: '0.35rem' }}>
            Attendance Rate
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#60A5FA' }}>
            {stats.attendanceRate}%
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.2rem' }}>Turnout percentage</div>
        </div>

        {/* Remaining to Check In */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '14px' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 700, marginBottom: '0.35rem' }}>
            Pending Arrival
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#FBBF24' }}>
            {Math.max(0, stats.totalRegistered - stats.totalCheckedIn)}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.2rem' }}>Remaining tickets</div>
        </div>
      </div>

      {/* Main Scanner Section (Split Grid) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)',
        gap: '2rem',
        alignItems: 'start',
      }}>
        {/* Left Side: Scanner & Search Device */}
        <div>
          <div className="glass-panel" style={{
            padding: '1.75rem',
            borderRadius: '20px',
            border: '1px solid rgba(66, 133, 244, 0.3)',
            marginBottom: '1.5rem',
          }}>
            {/* Mode Switcher Tabs */}
            <div style={{
              display: 'flex',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '0.35rem',
              borderRadius: '12px',
              gap: '0.35rem',
              marginBottom: '1.5rem',
            }}>
              <button
                type="button"
                onClick={() => setActiveTab('camera')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem',
                  borderRadius: '9px',
                  background: activeTab === 'camera' ? 'rgba(66, 133, 244, 0.25)' : 'transparent',
                  border: activeTab === 'camera' ? '1px solid rgba(66, 133, 244, 0.4)' : 'none',
                  color: activeTab === 'camera' ? '#93C5FD' : '#94A3B8',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem',
                  borderRadius: '9px',
                  background: activeTab === 'manual' ? 'rgba(66, 133, 244, 0.25)' : 'transparent',
                  border: activeTab === 'manual' ? '1px solid rgba(66, 133, 244, 0.4)' : 'none',
                  color: activeTab === 'manual' ? '#93C5FD' : '#94A3B8',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Keyboard size={16} />
                <span>Barcode / Pass</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('walkin')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem',
                  borderRadius: '9px',
                  background: activeTab === 'walkin' ? 'rgba(66, 133, 244, 0.25)' : 'transparent',
                  border: activeTab === 'walkin' ? '1px solid rgba(66, 133, 244, 0.4)' : 'none',
                  color: activeTab === 'walkin' ? '#93C5FD' : '#94A3B8',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Search size={16} />
                <span>Search / Walk-in</span>
              </button>
            </div>

            {/* Camera Scanner View */}
            {activeTab === 'camera' && (
              <div>
                <div style={{
                  position: 'relative',
                  width: '100%',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#000000',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  minHeight: '320px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div id={scannerContainerId} style={{ width: '100%' }} />

                  {cameraError && (
                    <div style={{
                      padding: '1.5rem',
                      textAlign: 'center',
                      color: '#FCA5A5',
                    }}>
                      <AlertCircle size={32} style={{ margin: '0 auto 0.75rem' }} />
                      <div style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>{cameraError}</div>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="btn-primary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
                      >
                        Retry Camera
                      </button>
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '0.85rem',
                  fontSize: '0.78rem',
                  color: '#94A3B8',
                }}>
                  <span>Align attendee QR code inside the bounding box</span>
                  <span style={{ color: '#4ADE80' }}>● Camera Active</span>
                </div>
              </div>
            )}

            {/* Manual Code / Barcode Scanner Input */}
            {activeTab === 'manual' && (
              <div>
                <form onSubmit={handleManualCodeSubmit}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                      QR Code String / Ticket Pass ID
                    </label>
                    <input
                      type="text"
                      autoFocus
                      required
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="e.g. GDGOC-REG-..."
                      style={{
                        width: '100%',
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(66, 133, 244, 0.3)',
                        color: '#FFFFFF',
                        fontFamily: 'monospace',
                        fontSize: '0.95rem',
                        outline: 'none',
                      }}
                    />
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.35rem' }}>
                      Supports USB barcode scanner auto-submit or manual typing. Press <strong>Enter</strong> to verify.
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing || !manualCode.trim()}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '0.85rem 1.5rem',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <CheckCircle2 size={17} />
                    <span>{isProcessing ? 'Verifying...' : 'Confirm Check-in'}</span>
                  </button>
                </form>
              </div>
            )}

            {/* Walk-in & Search Tab (§4.4) */}
            {activeTab === 'walkin' && (
              <div>
                {/* Search Bar */}
                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                  <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, or phone number..."
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem 0.85rem 2.75rem',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(66, 133, 244, 0.3)',
                      color: '#FFFFFF',
                      fontSize: '0.92rem',
                      outline: 'none',
                    }}
                  />
                  {isSearching && (
                    <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#60A5FA' }} />
                  )}
                </div>

                {/* Quick Add Walk-in Callout Button */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  borderRadius: '12px',
                  background: 'rgba(66, 133, 244, 0.08)',
                  border: '1px solid rgba(66, 133, 244, 0.25)',
                  marginBottom: '1.5rem',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#F1F5F9' }}>
                      Attendee not pre-registered?
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                      Register on the spot & check in immediately (&lt; 10s).
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowWalkinModal(true)}
                    className="btn-primary"
                    style={{
                      padding: '0.55rem 1rem',
                      fontSize: '0.84rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <UserPlus size={15} />
                    <span>Register Walk-in</span>
                  </button>
                </div>

                {/* Search Results List */}
                {searchQuery.trim().length >= 2 && (
                  <div>
                    <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', fontWeight: 700, marginBottom: '0.75rem' }}>
                      Search Results ({searchResults.length})
                    </div>

                    {searchResults.length === 0 && !isSearching ? (
                      <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748B', fontSize: '0.88rem' }}>
                        No registered attendees found matching "{searchQuery}".
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '360px', overflowY: 'auto' }}>
                        {searchResults.map((attendee) => (
                          <div
                            key={attendee.id}
                            style={{
                              padding: '1rem',
                              borderRadius: '12px',
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '1rem',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F8FAFC' }}>
                                {attendee.full_name}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.1rem' }}>
                                {attendee.email} {attendee.phone ? `• ${attendee.phone}` : ''}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                                Pass: {attendee.qr_code}
                              </div>
                            </div>

                            <div>
                              {attendee.isCheckedIn ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.35rem 0.75rem',
                                  borderRadius: '20px',
                                  background: 'rgba(52, 168, 83, 0.15)',
                                  color: '#4ADE80',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  border: '1px solid rgba(52, 168, 83, 0.3)',
                                }}>
                                  <CheckCircle2 size={13} />
                                  Checked In
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => handleManualCheckinAttendee(attendee.id)}
                                  className="btn-primary"
                                  style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                  }}
                                >
                                  <UserCheck size={14} />
                                  <span>Check In</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Last Scan Result Card (Real-time Pulse) */}
          {lastResult && (
            <div className="glass-panel" style={{
              padding: '1.5rem',
              borderRadius: '16px',
              border: `1px solid ${
                lastResult.type === 'success'
                  ? 'rgba(52, 168, 83, 0.4)'
                  : lastResult.type === 'duplicate'
                  ? 'rgba(251, 188, 4, 0.4)'
                  : 'rgba(234, 67, 53, 0.4)'
              }`,
              background: `linear-gradient(180deg, ${
                lastResult.type === 'success'
                  ? 'rgba(52, 168, 83, 0.12)'
                  : lastResult.type === 'duplicate'
                  ? 'rgba(251, 188, 4, 0.12)'
                  : 'rgba(234, 67, 53, 0.12)'
              } 0%, rgba(19, 27, 46, 0.95) 100%)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: lastResult.type === 'success' ? 'rgba(52, 168, 83, 0.2)' : 'rgba(234, 67, 53, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {lastResult.type === 'success' ? (
                    <CheckCircle2 size={24} color="#4ADE80" />
                  ) : lastResult.type === 'duplicate' ? (
                    <AlertCircle size={24} color="#FBBF24" />
                  ) : (
                    <AlertCircle size={24} color="#F87171" />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.78rem',
                    textTransform: 'uppercase',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    color: lastResult.type === 'success' ? '#4ADE80' : lastResult.type === 'duplicate' ? '#FBBF24' : '#F87171',
                  }}>
                    {lastResult.message}
                  </div>

                  {lastResult.attendee && (
                    <div style={{ marginTop: '0.35rem' }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF' }}>
                        {lastResult.attendee.full_name}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#CBD5E1' }}>
                        {lastResult.attendee.email}
                      </div>
                      {lastResult.attendee.phone && (
                        <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                          {lastResult.attendee.phone}
                        </div>
                      )}
                    </div>
                  )}

                  {lastResult.checkInTime && (
                    <div style={{
                      fontSize: '0.76rem',
                      color: '#94A3B8',
                      marginTop: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}>
                      <Clock size={12} />
                      <span>Checked in at: {new Date(lastResult.checkInTime).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Live Attendance Stream Feed */}
        <div>
          <div className="glass-panel" style={{
            padding: '1.5rem',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              paddingBottom: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={17} color="#60A5FA" />
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>
                  Live Attendance Feed
                </span>
              </div>
              <span style={{ fontSize: '0.76rem', color: '#94A3B8' }}>
                {stats.recentCheckins.length} scanned
              </span>
            </div>

            {stats.recentCheckins.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                color: '#64748B',
              }}>
                <QrCode size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>No check-ins yet</div>
                <div style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>
                  Scanned attendees will appear in this real-time stream.
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                maxHeight: '480px',
                overflowY: 'auto',
              }}>
                {stats.recentCheckins.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 0.9rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(52, 168, 83, 0.15)',
                        border: '1px solid rgba(52, 168, 83, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: '#4ADE80',
                        fontSize: '0.75rem',
                        flexShrink: 0,
                      }}>
                        {item.registration?.full_name?.charAt(0) || 'A'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#F1F5F9' }}>
                          {item.registration?.full_name || 'Attendee'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                          {item.registration?.email}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#60A5FA' }}>
                        {new Date(item.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                        via {item.method.toUpperCase()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fast 10-Second Walk-in Registration Modal (§4.4) */}
      {showWalkinModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem',
        }}>
          <div className="glass-panel" style={{
            maxWidth: '480px',
            width: '100%',
            padding: '2rem',
            borderRadius: '20px',
            border: '1px solid rgba(66, 133, 244, 0.3)',
            background: 'linear-gradient(180deg, #131B2E 0%, #0F172A 100%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(66, 133, 244, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <UserPlus size={20} color="#60A5FA" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Fast Walk-in Registration
                </h2>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                  Register on the spot & check in immediately (&lt; 10 seconds)
                </div>
              </div>
            </div>

            {walkinError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(234, 67, 53, 0.15)',
                border: '1px solid rgba(234, 67, 53, 0.3)',
                color: '#FCA5A5',
                fontSize: '0.84rem',
                marginBottom: '1rem',
              }}>
                <AlertCircle size={16} />
                <span>{walkinError}</span>
              </div>
            )}

            <form onSubmit={handleWalkinSubmit}>
              {/* Full Name */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                  Attendee Full Name <span style={{ color: 'var(--google-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={walkinFullName}
                  onChange={(e) => setWalkinFullName(e.target.value)}
                  placeholder="e.g. Mahmoud Mostafa"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                  Email Address <span style={{ color: 'var(--google-red)' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  value={walkinEmail}
                  onChange={(e) => setWalkinEmail(e.target.value)}
                  placeholder="e.g. mahmoud@example.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Phone */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                  Phone / WhatsApp (Optional)
                </label>
                <input
                  type="tel"
                  value={walkinPhone}
                  onChange={(e) => setWalkinPhone(e.target.value)}
                  placeholder="e.g. +20 10 9999 8888"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowWalkinModal(false)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.75rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="btn-primary"
                  style={{
                    flex: 1.5,
                    padding: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    fontWeight: 700,
                  }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Register &amp; Check In</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
