'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import Sidebar from '@/components/ui/Sidebar';
import { navItems, legalLinks } from '@/config/navigation';
import { remainingBreakdown } from '@/lib/helpers';
import { stakingData } from '@/static/uiData';
import FaqSection from '@/components/ui/Faq';
import Button from '@/components/ui/Button';
import { CheckIcon, XLogoIcon } from '@/assets/icons';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceDot } from 'recharts';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import axios from 'axios';
import { useToast } from '@/hooks/useToast';
import dayjs from '@/lib/dayjs';

export default function PreRegistrationClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { showToast } = useToast();

  // Optional countdown (same env/fallback behavior as Home)
  const [remainingSec, setRemainingSec] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const init = async () => {
      let endAt: ReturnType<typeof dayjs> | null = null;
      // Always fetch preRegistrationDate from base API
      try {
        const resp = await axios.get('https://hpp-event-wallet.hpp.io/api/base', {
          headers: { accept: 'application/json' },
        });
        const data: any = resp?.data ?? {};
        const s: string | undefined = data?.data?.preRegistrationDate;
        if (s && typeof s === 'string') {
          // Expect format "YYYY-MM-DD HH:mm"
          let d = dayjs(s);
          if (!d.isValid()) d = dayjs(s.replace(' ', 'T'));
          if (!d.isValid()) d = dayjs(`${s.replace(' ', 'T')}Z`);
          endAt = d.isValid() ? d : null;
        }
      } catch {
        // ignore; keep null to skip timer
      }
      if (!endAt || !endAt.isValid()) return;
      const calc = () => Math.max(0, endAt!.diff(dayjs(), 'second'));
      if (cancelled) return;
      const first = calc();
      setRemainingSec(first);
      if (first === 0) return; // already closed -> don't start ticking
      intervalId = setInterval(() => {
        if (cancelled) return;
        const next = calc();
        setRemainingSec(next);
        if (next === 0 && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }, 1000);
    };
    void init();
    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, []);

  const breakdown = React.useMemo(() => remainingBreakdown(remainingSec ?? 0), [remainingSec]);

  // Local form state (UI only)
  const [ethAddress, setEthAddress] = useState('');
  const [agreed, setAgreed] = useState(false);
  const isValidEth = /^0x[a-fA-F0-9]{40}$/.test(ethAddress.trim());
  const termsLink = legalLinks.find((l) => (l.label || '').toLowerCase().includes('terms'))?.href;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const shareIntentUrl = React.useMemo(() => {
    const base = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
    const pageUrl = `${base}/staking/pre-registration`;
    const textEncoded =
      'HPP%20Staking%20Pre-Registration%20is%20LIVE!%0A%0APre-register%20now%20and%20lock%20in%20up%20to%2020%25%20APR.%0A%F0%9F%92%B0%20Just%20drop%20your%20ETH%20wallet,%20that%27s%20it.%0ABring%20your%20buddy,%20boost%20the%20APR,%20earn%20together.%20%F0%9F%9A%80';
    return `https://x.com/intent/tweet?text=${textEncoded}&url=${encodeURIComponent(pageUrl)}`;
  }, []);

  // Fetch pre-registration stats from API (reusable)
  const fetchStats = React.useCallback(async () => {
    try {
      const resp = await axios.get('https://hpp-event-wallet.hpp.io/api/stats', {
        headers: { accept: 'application/json' },
      });
      const data: any = resp?.data ?? {};
      if (data?.success && data?.data) {
        const d = data.data;
        if (typeof d.totalPreRegisteredWallets === 'number') {
          setTotalWallets(d.totalPreRegisteredWallets);
        }
        if (typeof d.dailyRegisteredWallets === 'number') {
          setDailyRegistered(d.dailyRegisteredWallets);
        }
        if (typeof d.currentAPR === 'number') {
          setCurrentAprApi(d.currentAPR);
        }
        if (typeof d.nextGoalAPR === 'number') {
          setNextGoalAprApi(d.nextGoalAPR);
        }
      }
    } catch {}
  }, []);

  const handleRegisterClick = React.useCallback(async () => {
    if (!isValidEth || !agreed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const resp = await axios.post(
        'https://hpp-event-wallet.hpp.io/api/wallets',
        { address: ethAddress.trim() },
        {
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );
      const data: any = resp?.data ?? {};
      if (data?.success === false) {
        const message = data?.error?.message;
        showToast(`Registration failed.`, message, 'error');
        return;
      }
      setEthAddress('');
      // Success toast with Invite Friends action
      showToast(
        'You Are All Set!',
        'Bring your buddy, Boost the APR, Earn together!',
        'success',
        undefined,
        <Button
          variant="black"
          size="sm"
          className="!rounded-full px-4 py-2 whitespace-nowrap"
          href={shareIntentUrl}
          external
          leftIcon={<XLogoIcon className="w-4 h-4" />}
        >
          Invite Friends
        </Button>
      );
      await fetchStats();
    } catch (e: any) {
      const data = e?.response?.data;
      const message = data?.error?.message;
      showToast(`Registration failed.`, message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [isValidEth, agreed, isSubmitting, ethAddress, fetchStats]);

  // Stats (to be wired to API)
  const [totalWallets, setTotalWallets] = useState<number>(0);
  const [dailyRegistered, setDailyRegistered] = useState<number>(0);
  const [currentAprApi, setCurrentAprApi] = useState<number>(0);
  const [nextGoalAprApi, setNextGoalAprApi] = useState<number>(0);

  // Initial fetch on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Responsive chart side margins (match LineChart and overlay pill math)
  const [chartSideMargin, setChartSideMargin] = useState<number>(40);
  const [isNarrow450, setIsNarrow450] = useState<boolean>(false);
  const [isNarrow600, setIsNarrow600] = useState<boolean>(false);
  useEffect(() => {
    const compute = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
      setChartSideMargin(w <= 600 ? 10 : 40);
      setIsNarrow450(w <= 450);
      setIsNarrow600(w <= 600);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  // Chart data for Pre-Registration Status
  // Clamp cutoff to max 20, min 10
  const CUTOFF_PERCENT = React.useMemo(() => {
    if (currentAprApi != null) {
      const steps = [10, 12, 14, 16, 18, 20] as const;
      const clamped = Math.max(10, Math.min(20, Math.round(currentAprApi)));
      const nearest = steps.reduce(
        (prev, curr) => (Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev),
        steps[0]
      );
      return nearest;
    }
    const w = Math.max(0, totalWallets);
    if (w >= 1000) return 20;
    const idx = Math.max(0, Math.min(4, Math.floor(Math.max(0, w - 1) / 200)));
    return (10 + idx * 2) as 10 | 12 | 14 | 16 | 18 | 20;
  }, [totalWallets, currentAprApi]);
  // Continuous chart percent for smooth movement (10 ~ 20)
  const CHART_PERCENT = React.useMemo(() => {
    const w = Math.max(0, Math.min(1000, totalWallets));
    return 10 + (w / 1000) * 10;
  }, [totalWallets]);
  const statusData = React.useMemo(() => {
    const basePts = [
      { percent: 10, val: 0.5 },
      { percent: 12, val: 1.2 },
      { percent: 14, val: 2.2 },
      { percent: 16, val: 3.8 },
      { percent: 18, val: 6.5 },
      { percent: 20, val: 10 },
    ];
    // Linear interpolation helper between surrounding base points
    const interp = (p: number) => {
      const sorted = [...basePts].sort((a, b) => a.percent - b.percent);
      let prev = sorted[0];
      for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];
        if (p === prev.percent) return prev.val;
        if (p === next.percent) return next.val;
        if (p > prev.percent && p < next.percent) {
          const t = (p - prev.percent) / (next.percent - prev.percent);
          return prev.val + t * (next.val - prev.val);
        }
        prev = next;
      }
      return sorted[sorted.length - 1].val;
    };
    const hasCutoff = basePts.some((bp) => bp.percent === CHART_PERCENT);
    const pts = hasCutoff ? [...basePts] : [...basePts, { percent: CHART_PERCENT, val: interp(CHART_PERCENT) }];
    pts.sort((a, b) => a.percent - b.percent);
    return pts.map((p) => ({
      percent: p.percent,
      growth: p.val,
      green: p.percent <= CHART_PERCENT ? p.val : null,
    }));
  }, [CHART_PERCENT]);

  // APR Goal progress percent driven by totalWallets (0 ~ 1000 -> 0 ~ 100%)
  // 0 wallets => start of 10% tick; 1000 wallets => 20% tick (full bar)
  const progressPercent = React.useMemo(() => {
    const pct = (Math.max(0, Math.min(1000, totalWallets)) / 1000) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [totalWallets]);

  const nextGoalApr = React.useMemo(() => {
    const steps = [10, 12, 14, 16, 18, 20] as const;
    if (nextGoalAprApi != null) {
      const clamped = Math.max(10, Math.min(20, Math.round(nextGoalAprApi)));
      const nearest = steps.reduce(
        (prev, curr) => (Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev),
        steps[0]
      );
      return nearest;
    }
    const next = steps.find((s) => s > CUTOFF_PERCENT);
    return (next ?? 20) as 10 | 12 | 14 | 16 | 18 | 20;
  }, [CUTOFF_PERCENT, nextGoalAprApi]);

  const formattedTotalWallets = React.useMemo(() => {
    return totalWallets >= 1000 ? '1,000+' : totalWallets.toLocaleString();
  }, [totalWallets]);

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-x-hidden">
      <Header
        onMenuClick={() => setSidebarOpen(true)}
        isSidebarOpen={sidebarOpen}
        onBackClick={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          navItems={navItems}
          legalLinks={legalLinks}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarOpen ? 'opacity-50 min-[1200px]:opacity-100' : ''
          }`}
        >
          {/* Hero */}
          <div className="py-12.5">
            <div className="px-4 max-w-6xl mx-auto text-center">
              <div className="flex justify-center mb-3">
                <DotLottieReact
                  src="/lotties/Staking.lottie"
                  autoplay
                  loop
                  className="w-20 h-20"
                  renderConfig={{
                    autoResize: true,
                    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 2,
                    freezeOnOffscreen: true,
                  }}
                  layout={{ fit: 'contain', align: [0.5, 0.5] }}
                />
              </div>
              <div className="text-white font-[900] leading-[1.2]">
                <div className="text-4xl min-[810px]:text-5xl">HPP Staking</div>
                <div className="text-[#5DF23F] text-4xl min-[810px]:text-5xl mt-4">Pre-Registration</div>
              </div>
              <div className="mt-4">
                <p className="text-lg text-[#bfbfbf]">Pre-register now to secure up to 20% APR!</p>
                <p className="text-lg text-[#bfbfbf]">Bring your buddy, Boost the APR, Earn together!</p>
              </div>
              {remainingSec !== null && (
                <div className="mt-5 inline-grid grid-cols-7 items-end justify-items-center text-white gap-0">
                  <div
                    className="col-span-1 text-3xl font-[800] tabular-nums leading-none w-[2ch] text-center"
                    style={{
                      fontFamily:
                        'Pretendard, ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    }}
                  >
                    {String(breakdown.days).padStart(2, '0')}
                  </div>
                  <div className="col-span-1 text-3xl font-[600] text-[#999999] w-[1ch] text-center leading-none">
                    :
                  </div>
                  <div
                    className="col-span-1 text-3xl font-[800] tabular-nums leading-none w-[2ch] text-center"
                    style={{
                      fontFamily:
                        'Pretendard, ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    }}
                  >
                    {breakdown.hours}
                  </div>
                  <div className="col-span-1 text-3xl font-[600] text-[#999999] w-[1ch] text-center leading-none">
                    :
                  </div>
                  <div
                    className="col-span-1 text-3xl font-[800] tabular-nums leading-none w-[2ch] text-center"
                    style={{
                      fontFamily:
                        'Pretendard, ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    }}
                  >
                    {breakdown.minutes}
                  </div>
                  <div className="col-span-1 text-3xl font-[600] text-[#999999] w-[1ch] text-center leading-none">
                    :
                  </div>
                  <div
                    className="col-span-1 text-3xl font-[800] tabular-nums leading-none w-[2ch] text-center"
                    style={{
                      fontFamily:
                        'Pretendard, ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    }}
                  >
                    {breakdown.seconds}
                  </div>
                  <div className="col-span-1 mt-2.5 text-xs font-semibold w-[2ch] leading-none text-center relative -left-[4px]">
                    Days
                  </div>
                  <div className="col-span-1 mt-2.5 w-[1ch]" />
                  <div className="col-span-1 mt-2.5 text-xs font-semibold w-[2ch] leading-none text-center relative -left-[8px]">
                    Hours
                  </div>
                  <div className="col-span-1 mt-2.5 w-[1ch]" />
                  <div className="col-span-1 mt-2.5 text-xs font-semibold w-[2ch] leading-none text-center relative -left-[4px]">
                    Mins
                  </div>
                  <div className="col-span-1 mt-2.5 w-[1ch]" />
                  <div className="col-span-1 mt-2.5 text-xs font-semibold w-[2ch] leading-none text-center relative -left-[4px]">
                    Secs
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pre-Registration Block */}
          <div className="px-4 max-w-6xl mx-auto w-full mt-6">
            <div className="flex flex-col min-[810px]:flex-row items-start min-[810px]:items-center justify-between mb-3">
              <h2 className="text-3xl font-black">Pre-Registration</h2>
              <Button
                variant="primary"
                size="sm"
                className="!rounded-full px-4 py-2 whitespace-nowrap mt-2 min-[810px]:mt-0 self-start min-[810px]:self-auto"
                href={shareIntentUrl}
                external
                leftIcon={<XLogoIcon className="w-4 h-4" />}
              >
                Invite Friends
              </Button>
            </div>

            <div className="rounded-[5px] px-5 py-7.5 bg-[#4b4ab0]">
              <div className="flex flex-col min-[810px]:flex-row min-[810px]:items-center min-[810px]:justify-between gap-4">
                <div className="flex-1">
                  <label className="text-white text-base font-normal block mb-2">Enter Your ETH Address</label>
                  <input
                    className="w-full bg-white text-black rounded px-4 py-3 outline-none"
                    placeholder="0x..."
                    value={ethAddress}
                    onChange={(e) => setEthAddress(e.target.value)}
                  />
                  <label className="mt-3 flex items-center gap-2 text-white text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="sr-only appearance-none"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                    />
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-[4px]">
                      {agreed ? (
                        <CheckIcon className="w-5 h-5" />
                      ) : (
                        <span className="block w-4 h-4 rounded-[4px] bg-[#BBBBBB]/15" />
                      )}
                    </span>
                    <span className="text-sm text-white leading-[1] font-normal">
                      Agreement for{' '}
                      <a
                        href={termsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-white font-semibold"
                      >
                        Terms & Conditions
                      </a>
                    </span>
                  </label>
                </div>
                <div className="min-[810px]:ml-4">
                  <Button
                    variant="black"
                    size="lg"
                    disabled={!isValidEth || !agreed || isSubmitting}
                    className="!rounded-full px-6 py-3"
                    onClick={handleRegisterClick}
                  >
                    {isSubmitting ? 'Registering...' : 'Register Now'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Status Cards */}
          <div className="px-4 max-w-6xl mx-auto w-full mt-6">
            <div className="grid grid-cols-1 min-[1000px]:grid-cols-4 gap-0 rounded-[5px] overflow-hidden">
              {/* Left: Chart/Status */}
              <div className="bg-[#121212] py-4 px-6.5 border border-[#2D2D2D] min-[1000px]:col-span-2">
                <div className="flex items-center gap-2 mb-3 justify-center min-[810px]:justify-start">
                  <span>🔥</span>
                  <span className="text-base font-normal leading-[1.2] tracking-[0.8px] text-[#bfbfbf]">
                    Pre-Registration Status
                  </span>
                </div>
                <div className="relative h-[180px] min-[1000px]:h-[210px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={statusData}
                      margin={{ top: 10, right: chartSideMargin, left: chartSideMargin, bottom: 10 }}
                    >
                      <CartesianGrid vertical stroke="#2a2a2a" strokeDasharray="3 6" horizontal={false} />
                      <XAxis
                        dataKey="percent"
                        ticks={[12, 14, 16, 18, 20]}
                        tickFormatter={(v: number) =>
                          v === 20
                            ? isNarrow450
                              ? '20%'
                              : '20% Max'
                            : CUTOFF_PERCENT >= 20
                            ? ''
                            : v > CUTOFF_PERCENT
                            ? `${v}%`
                            : ''
                        }
                        tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12, dy: 0 }}
                        tickMargin={10}
                        axisLine={false}
                        tickLine={false}
                        type="number"
                        domain={[10, 20]}
                      />
                      <YAxis hide domain={[0, 10]} />
                      <Line
                        type="natural"
                        dataKey="growth"
                        stroke="#ffffff"
                        strokeWidth={4}
                        dot={false}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Line
                        type="natural"
                        dataKey="green"
                        stroke="#5DF23F"
                        strokeWidth={6}
                        dot={false}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <ReferenceDot
                        x={CHART_PERCENT}
                        y={(statusData.find((d) => d.percent === CHART_PERCENT)?.growth as number) || 0}
                        r={8}
                        fill="#5DF23F"
                        stroke="#ffffff"
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  {(() => {
                    // Align pills with chart plot area (accounts for chart left/right margins)
                    const leftMargin = chartSideMargin; // Must match LineChart margin.left
                    const rightMargin = chartSideMargin; // Must match LineChart margin.right
                    const ratioToCalc = (p: number) => (p - 10) / (20 - 10);
                    const leftCalc = (p: number) =>
                      `calc(${leftMargin}px + ${ratioToCalc(p)} * (100% - ${leftMargin}px - ${rightMargin}px))`;
                    // Build pills dynamically up to cutoff (max 20). Others remain as XAxis labels.
                    const allSteps = [10, 12, 14, 16, 18, 20];
                    const maxPill = Math.min(CUTOFF_PERCENT, 20);
                    const pillSteps = allSteps.filter((p) => p <= maxPill);
                    return (
                      <div className="absolute inset-x-0 bottom-8">
                        {pillSteps.map((p) => {
                          const isBase = p === 10;
                          const label = isBase ? (isNarrow450 ? '10%' : 'Base 10%') : `${p}%`;
                          return (
                            <span
                              key={p}
                              className={[
                                'absolute text-xs px-2 py-1 rounded-full font-normal',
                                'bg-[#5DF23F] text-black',
                              ].join(' ')}
                              style={{ left: leftCalc(p), transform: 'translateX(-50%)' }}
                            >
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Right: Stats grid */}
              <div className="min-[1000px]:col-span-2 grid grid-cols-1 min-[600px]:grid-cols-2 gap-0 divide-y min-[600px]:divide-x divide-[#161616] bg-[#121212]">
                <div className="p-6 flex flex-col items-center justify-center border-y border-[#2D2D2D]">
                  <div className="text-base font-normal whitespace-nowrap leading-[1.2] tracking-[0.8px] text-[#bfbfbf]">
                    Total Pre-Registered Wallet
                  </div>
                  <div className="text-white text-3xl font-semibold leading-[24px] mt-2.5">
                    {totalWallets.toLocaleString()}
                  </div>
                </div>
                <div className="p-6 flex flex-col items-center justify-center border border-l-0 border-[#2D2D2D]">
                  <div className="text-base font-normal whitespace-nowrap leading-[1.2] tracking-[0.8px] text-[#bfbfbf]">
                    Daily Registered Wallets
                  </div>
                  <div className="text-white text-3xl font-semibold leading-[24px] mt-2.5">
                    {dailyRegistered.toLocaleString()}
                  </div>
                </div>
                <div className="p-6 flex flex-col items-center justify-center border-r border-[#2D2D2D]">
                  <div className="text-base font-normal whitespace-nowrap leading-[1.2] tracking-[0.8px] text-[#bfbfbf]">
                    Current APR
                  </div>
                  <div className="text-white text-3xl font-semibold leading-[24px] mt-2.5">{CUTOFF_PERCENT}%</div>
                </div>
                <div className="p-6 flex flex-col items-center justify-center border-r border-b border-[#2D2D2D]">
                  <div className="text-base font-normal whitespace-nowrap leading-[1.2] tracking-[0.8px] text-[#bfbfbf]">
                    Next Goal APR
                  </div>
                  <div className="text-white text-3xl font-semibold leading-[24px] mt-2.5">{nextGoalApr}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* APR Goal */}
          <div className="px-4 max-w-6xl mx-auto w-full mt-5">
            <div className="rounded-[5px] bg-[#121212] px-5 py-7.5">
              <h3 className="text-white text-xl font-semibold mb-12.5">APR Goal</h3>
              {/* Progress track */}
              <div className="relative">
                {/* Track with dashed ticks */}
                <div className="h-5 rounded-full bg-black/50 relative overflow-hidden">
                  {([12, 14, 16, 18, 20] as const).map((p) => {
                    const leftPct = ((p - 10) / (20 - 10)) * 100;
                    // Past ticks: solid black on top of the green fill; Future ticks: faint white
                    const tickColor = p <= CUTOFF_PERCENT ? '#0b0b0b' : 'rgba(255,255,255,0.24)';
                    return (
                      <div
                        key={p}
                        className="absolute top-0 bottom-0 border-l border-dashed z-10"
                        style={{ left: `${leftPct}%`, borderColor: tickColor }}
                      />
                    );
                  })}
                  <div className="h-full bg-[#5DF23F] rounded-l-full" style={{ width: `${progressPercent}%` }} />
                </div>
                {/* pointer bubble at current */}
                <div
                  className="absolute -top-11"
                  style={{ left: `${progressPercent}%`, transform: 'translateX(-50%)' }}
                >
                  <span className="relative inline-block px-2 py-1 rounded bg-[#5DF23F] text-black text-sm font-semibold shadow">
                    {formattedTotalWallets}
                    <span
                      className="absolute left-1/2"
                      style={{
                        transform: 'translateX(-50%)',
                        bottom: -10,
                        width: 0,
                        height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: '6px solid #5DF23F',
                        borderBottom: '6px solid transparent',
                      }}
                    />
                  </span>
                </div>
                {/* tick labels */}
                <div className="mt-2 relative h-5">
                  {[
                    { p: 10, label: isNarrow450 ? '10%' : '10% (Base)' },
                    { p: 12, label: '12%' },
                    { p: 14, label: '14%' },
                    { p: 16, label: '16%' },
                    { p: 18, label: '18%' },
                    { p: 20, label: isNarrow450 ? '20%' : '20% (Max)' },
                  ].map(({ p, label }) => {
                    const isGreen = p >= 10 && p <= CUTOFF_PERCENT;
                    const leftPct = ((p - 10) / (20 - 10)) * 100;
                    return (
                      <span
                        key={p}
                        className={[
                          'absolute whitespace-nowrap font-semibold text-xs min-[810px]:text-sm',
                          isGreen ? 'text-[#5DF23F]' : 'text-white',
                          p === 10
                            ? 'translate-x-0 text-left'
                            : p === 20
                            ? '-translate-x-full text-right'
                            : '-translate-x-1/2 text-center',
                        ].join(' ')}
                        style={{ left: p === 10 ? '0%' : p === 20 ? '100%' : `${leftPct}%` }}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 min-[600px]:grid-cols-2 gap-x-6">
                {(() => {
                  const rows = [
                    { range: '0~200 Wallets', desc: 'Standard APR (10%)', apr: 'APR 10% (Base)' },
                    { range: '201~400 Wallets', desc: 'Standard APR (10%) + Bonus APR (2%)', apr: 'APR 12%' },
                    { range: '401~600 Wallets', desc: 'Standard APR (10%) + Bonus APR (4%)', apr: 'APR 14%' },
                    { range: '601~800 Wallets', desc: 'Standard APR (10%) + Bonus APR (6%)', apr: 'APR 16%' },
                    { range: '801~1000 Wallets', desc: 'Standard APR (10%) + Bonus APR (8%)', apr: 'APR 18%' },
                    { range: '1,000+ Wallets', desc: 'Standard APR (10%) + Bonus APR (10%)', apr: 'APR 20% (Max)' },
                  ];
                  const currentRangeIdx = totalWallets >= 1000 ? 5 : Math.floor(Math.max(0, totalWallets - 1) / 200);
                  const steps = [10, 12, 14, 16, 18, 20] as const;
                  const aprReachedIdx = Math.max(0, steps.indexOf(CUTOFF_PERCENT));
                  return rows.map((row, idx) => {
                    const leftActive = idx <= currentRangeIdx;
                    const rightActive = idx <= aprReachedIdx;
                    return (
                      <React.Fragment key={idx}>
                        {/* Left: wallet bracket */}
                        <div className="mb-5">
                          <div
                            className={[
                              'inline-block font-bold text-sm px-3 py-2 rounded',
                              leftActive ? 'bg-[#5DF23F] text-black' : 'bg-white text-black',
                            ].join(' ')}
                          >
                            {row.range}
                          </div>
                          {/* Mobile (≤600px): one-line with check and combined APR */}
                          <div
                            className={[
                              'mt-2 text-sm flex items-center gap-1 min-[600px]:hidden',
                              leftActive ? 'text-[#5DF23F]' : 'text-white/80',
                            ].join(' ')}
                          >
                            {rightActive && (
                              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-[#5DF23F] text-[#5DF23F] text-[10px] leading-none">
                                ✓
                              </span>
                            )}
                            <span>
                              {`${row.desc} = ${
                                isNarrow600
                                  ? row.apr.replace('APR ', '').replace(/\s*\((Base|Max)\)\s*/g, '')
                                  : row.apr.replace('APR ', '')
                              }`}
                            </span>
                          </div>
                          {/* Desktop (≥600px): original two-line description */}
                          <div
                            className={[
                              'mt-2 text-sm hidden min-[600px]:block',
                              leftActive ? 'text-[#5DF23F]' : 'text-white/80',
                            ].join(' ')}
                          >
                            {row.desc}
                          </div>
                        </div>
                        {/* Right: APR label with reached indicator */}
                        <div className="mb-5 hidden min-[600px]:flex items-center justify-end gap-1">
                          {rightActive && (
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-[#5DF23F] text-[#5DF23F] text-[10px] leading-none">
                              ✓
                            </span>
                          )}
                          <span
                            className={[
                              'inline-block text-sm font-semibold text-right',
                              rightActive ? 'text-[#5DF23F]' : 'text-white',
                            ].join(' ')}
                          >
                            {row.apr}
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* FAQ */}
          <FaqSection items={stakingData.preRegistration.faq} className="px-4 max-w-6xl mx-auto w-full mt-36.5 mb-12" />

          <div className="mt-25">
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}
