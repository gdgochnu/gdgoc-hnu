'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { recordQrCheckin } from '@/app/events/actions';
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
  ChevronRight
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
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

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
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.1); // D6
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
        osc.frequency.setValueAtTime(220, ctx.currentTime); // Low buzz
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
          message: 'Check-in Confirmed!',
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
        (errorMessage) => {
          // ignore common scan frame noise
        }
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

  const handleManualSubmit = (e: React.FormEvent) => {
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
            <span>{soundEnabled ? 'Audio Chime ON' : 'Muted'}</span>
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
        gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)',
        gap: '2rem',
        alignItems: 'start',
      }}>
        {/* Left Side: Scanner Device */}
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
                  fontSize: '0.86rem',
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
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Keyboard size={16} />
                <span>Barcode / Pass Code</span>
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
                  <span style={{ color: '#4ADE80' }}>● Camera Ready</span>
                </div>
              </div>
            )}

            {/* Manual Code / Barcode Scanner Input */}
            {activeTab === 'manual' && (
              <div>
                <form onSubmit={handleManualSubmit}>
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
    </div>
  );
}
