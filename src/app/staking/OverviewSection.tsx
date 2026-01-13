'use client';

import React, { useMemo, useCallback } from 'react';
import Image from 'next/image';
import Dropdown from '@/components/ui/Dropdown';
import Button from '@/components/ui/Button';
import FaqSection from '@/components/ui/Faq';
import { stakingData } from '@/static/uiData';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { HPPTickerIcon, APR_Web2, APR_Mobile2 } from '@/assets/icons';
import AprJourneyInfo from '@/components/ui/AprJourneyInfo';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, ReferenceDot, AreaChart, Area, Tooltip } from 'recharts';
import AprCalculator from './AprCalculator';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setIsStatsLoading,
  setTotalStakers,
  setTotalStakedAmount,
  setBaseApr,
  setMaxApr,
  setOverviewTvl,
  setStatsInitialized,
} from '@/store/slices';
import { formatUnits } from 'viem';
import Big from 'big.js';
import dayjs from '@/lib/dayjs';
import { formatTokenBalance } from '@/lib/helpers';
import axios from 'axios';

const PERIODS: Array<{ key: string; label: string }> = [
  { key: '1M', label: '1 Month' },
  { key: '3M', label: '3 Month' },
  { key: '6M', label: '6 Month' },
  { key: '1Y', label: '1 Year' },
  { key: 'ALL', label: 'All' },
];

export default function OverviewSection() {
  const dispatch = useAppDispatch();
  // Redux state
  const topTab = useAppSelector((state) => state.ui.topTab);
  const statsInitialized = useAppSelector((state) => state.overview.statsInitialized);
  const isStatsLoading = useAppSelector((state) => state.overview.isStatsLoading);
  const isChartReady = useAppSelector((state) => state.overview.isChartReady);
  const overviewTvl = useAppSelector((state) => state.overview.overviewTvl);
  const chartAnimKey = useAppSelector((state) => state.overview.chartAnimKey);
  const chartSideMargin = useAppSelector((state) => state.overview.chartSideMargin);
  const totalStakers = useAppSelector((state) => state.overview.totalStakers);
  const totalStakedAmount = useAppSelector((state) => state.overview.totalStakedAmount);
  const baseApr = useAppSelector((state) => state.overview.baseApr);
  const maxApr = useAppSelector((state) => state.overview.maxApr);
  const isNarrow450 = useAppSelector((state) => state.overview.isNarrow450);
  const isNarrow600 = useAppSelector((state) => state.overview.isNarrow600);

  // Local state
  const [period, setPeriod] = React.useState<string>('1M');
  const [aprTab, setAprTab] = React.useState<'pre' | 'whale' | 'hold' | 'dao'>('whale');
  const [totalPreRegisteredWallets, setTotalPreRegisteredWallets] = React.useState<number>(0);

  // Check if screen width is 900px or less
  const [isNarrow900, setIsNarrow900] = React.useState(false);

  React.useEffect(() => {
    const checkWidth = () => {
      setIsNarrow900(window.innerWidth <= 900);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Build TVL chart data
  const tvlChartData = useMemo(() => {
    const src = Array.isArray(overviewTvl) ? overviewTvl : [];
    const denom = new Big(10).pow(18);
    return src.map((d) => {
      let tvlNum = 0;
      try {
        tvlNum = parseFloat(new Big(d.value || '0').div(denom).toString());
      } catch {}
      return {
        dateLabel: dayjs(d.date).format('MM/DD'),
        fullLabel: dayjs(d.date).format('YYYY-MM-DD'),
        tvl: tvlNum,
      };
    });
  }, [overviewTvl]);

  // Formatted Total Staked Amount
  const totalStakedAmountDisplay = useMemo(() => {
    try {
      const wei = BigInt((totalStakedAmount || '0').replace(/[^\d]/g, '') || '0');
      const units = formatUnits(wei, 18);
      return formatTokenBalance(units, 2);
    } catch {
      return '0';
    }
  }, [totalStakedAmount]);

  // Format Y-axis tick
  const formatYAxisTick = useCallback((n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toFixed(0);
  }, []);

  // Format number with commas
  const formatNumberWithCommas = useCallback((n: number) => {
    try {
      if (!Number.isFinite(n)) return '0';
      return n.toLocaleString();
    } catch {
      return '0';
    }
  }, []);

  // Render TVL tooltip
  const renderTvlTooltip = useCallback(
    ({ active, payload, label }: any) => {
      if (!active || !payload || !payload.length) return null;
      const val = Number(payload[0]?.value ?? 0);
      const fullLabel = payload?.[0]?.payload?.fullLabel ?? label;
      return (
        <div
          className="rounded-[6px] border border-[#2D2D2D] bg-[#0f0f0f] px-3 py-2 shadow-lg"
          style={{ pointerEvents: 'none' }}
        >
          <div className="text-xs text-white/70 mb-1">{fullLabel}</div>
          <div className="flex items-center gap-1.5 text-white font-semibold">
            <HPPTickerIcon className="w-4 h-4" />
            <span>{formatNumberWithCommas(val)}</span>
            <span className="text-white/70 text-xs">HPP</span>
          </div>
        </div>
      );
    },
    [formatNumberWithCommas]
  );

  // Fetch overview stats
  const fetchOverviewStats = React.useCallback(async () => {
    try {
      dispatch(setIsStatsLoading(true));
      const apiPeriod = period === 'ALL' ? 'All' : period;
      const apiBaseUrl = process.env.NEXT_PUBLIC_HPP_STAKING_API_URL;
      if (!apiBaseUrl) {
        console.error('NEXT_PUBLIC_HPP_STAKING_API_URL is not set');
        dispatch(setIsStatsLoading(false));
        return;
      }
      const resp = await axios.get(`${apiBaseUrl}/stats`, {
        headers: { accept: 'application/json' },
        params: { period: apiPeriod },
      });
      const data: any = resp?.data ?? {};
      if (data?.success && data?.data) {
        const d = data.data;
        if (typeof d.totalStakers === 'number') dispatch(setTotalStakers(d.totalStakers));
        if (typeof d.totalStakedAmount === 'string') dispatch(setTotalStakedAmount(d.totalStakedAmount));
        if (typeof d.baseAPR === 'number') dispatch(setBaseApr(d.baseAPR));
        if (typeof d.maxAPR === 'number') dispatch(setMaxApr(d.maxAPR));
        if (Array.isArray(d.tvlHistory)) dispatch(setOverviewTvl(d.tvlHistory));
      }
    } catch {
      // ignore network errors; keep defaults
    } finally {
      dispatch(setIsStatsLoading(false));
      dispatch(setStatsInitialized(true));
    }
  }, [period, dispatch]);

  // Fetch pre-registration stats
  const fetchPreRegistrationStats = React.useCallback(async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_HPP_STAKING_API_URL;
      if (!apiBaseUrl) {
        console.error('NEXT_PUBLIC_HPP_STAKING_API_URL is not set');
        return;
      }
      const resp = await axios.get(`${apiBaseUrl}/pre-registration/stats`, {
        headers: { accept: 'application/json' },
      });
      const data: any = resp?.data ?? {};
      if (data?.success && data?.data) {
        const d = data.data;
        if (typeof d.totalPreRegisteredWallets === 'number') {
          setTotalPreRegisteredWallets(d.totalPreRegisteredWallets);
        }
      }
    } catch {
      // ignore network errors; keep defaults
    }
  }, []);

  // Fetch overview stats when period changes or when overview tab is active
  React.useEffect(() => {
    if (topTab === 'overview') {
      fetchOverviewStats();
      fetchPreRegistrationStats();
    }
  }, [fetchOverviewStats, fetchPreRegistrationStats, topTab]);

  return (
    <div className="mx-auto w-full">
      <div className="mt-5 w-full mb-25">
        <div className="rounded-[8px] bg-[#121212] border border-[#2D2D2D] overflow-hidden">
          <div className="px-5 pt-5 pb-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[#BFBFBF] text-base font-semibold leading-[1.2] tracking-[0.8px]">
                  Total Value Locked
                </span>
              </div>
              <Dropdown value={period} onChange={setPeriod} options={PERIODS} />
            </div>
          </div>
          <div className="relative h-[240px] min-[1000px]:h-[280px] w-full px-2">
            {!statsInitialized || isStatsLoading ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <DotLottieReact src="/lotties/Loading.lottie" autoplay loop style={{ width: 48, height: 48 }} />
              </div>
            ) : isChartReady && tvlChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  key={chartAnimKey ?? 'tvl-init'}
                  data={tvlChartData}
                  margin={{ top: 10, right: chartSideMargin, left: chartSideMargin, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="tvlFillGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5DF23F" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#5DF23F" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical stroke="#2a2a2a" strokeDasharray="3 6" horizontal={false} />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12, dy: 0 }}
                    tickMargin={8}
                    axisLine={false}
                    tickLine={false}
                    interval={
                      isNarrow450 || isNarrow600
                        ? tvlChartData.length > 8
                          ? Math.floor((tvlChartData.length - 1) / 7)
                          : 0
                        : isNarrow900
                        ? tvlChartData.length > 12
                          ? Math.floor((tvlChartData.length - 1) / 11)
                          : 0
                        : tvlChartData.length > 16
                        ? Math.floor((tvlChartData.length - 1) / 15)
                        : 0
                    }
                  />
                  <YAxis
                    tickFormatter={formatYAxisTick}
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                    width={48}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={renderTvlTooltip} cursor={{ stroke: '#2D2D2D', strokeDasharray: '3 6' }} />
                  <Area
                    type="monotone"
                    dataKey="tvl"
                    stroke="#5DF23F"
                    strokeWidth={1}
                    fill="url(#tvlFillGradient)"
                    fillOpacity={1}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    isAnimationActive={true}
                    animationDuration={500}
                    animationEasing="ease-out"
                  />
                  {tvlChartData.length > 0 ? (
                    <ReferenceDot
                      x={tvlChartData[tvlChartData.length - 1].dateLabel}
                      y={tvlChartData[tvlChartData.length - 1].tvl}
                      r={5}
                      fill="#5DF23F"
                      stroke="#e6ffe2"
                      strokeWidth={2}
                      isAnimationActive={true}
                    />
                  ) : null}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#bfbfbf] text-sm">No TVL data.</div>
            )}
          </div>
          <div className="grid grid-cols-1 min-[900px]:grid-cols-3 border-t border-[#2D2D2D] divide-y divide-[#2D2D2D] min-[900px]:divide-y-0">
            <div className="p-7.5 min-[900px]:border-l border-[#2D2D2D] flex flex-col items-center justify-center text-center">
              <div className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px]">Total Staked Amount</div>
              <div className="flex items-center gap-1.5 justify-center mt-2.5">
                <HPPTickerIcon className="w-6 h-6" />
                <span className="text-white text-3xl font-semibold leading-[24px]">{totalStakedAmountDisplay}</span>
              </div>
            </div>
            <div className="p-7.5 min-[900px]:border-l border-[#2D2D2D] flex flex-col items-center justify-center text-center">
              <div className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px]">Base APR</div>
              <div className="text-white text-3xl font-semibold leading-[24px] mt-2.5">{baseApr}%</div>
            </div>
            <div className="p-7.5 min-[900px]:border-l border-[#2D2D2D] flex flex-col items-center justify-center text-center">
              <div className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px]">Max APR</div>
              <div className="text-white text-3xl font-semibold leading-[24px] mt-2.5">{maxApr}%</div>
            </div>
          </div>
        </div>
        {/* APR Journey */}
        <div className="mt-5 rounded-[5px] bg-[#121212] overflow-hidden">
          <div className="px-5 pt-5 pb-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[#BFBFBF] text-base font-semibold leading-[1.2] tracking-[0.8px]">
                  APR Journey
                </span>
              </div>
              <AprJourneyInfo />
            </div>
          </div>
          <div className="p-5 w-full">
            <Image
              src={APR_Web2}
              alt="APR Journey"
              className="hidden min-[900px]:block w-full h-auto"
              loading="lazy"
              sizes="100vw"
              style={{ width: '100%', height: 'auto' }}
              priority={false}
            />
            <Image
              src={APR_Mobile2}
              alt="APR Journey"
              className="block min-[900px]:hidden w-full h-auto"
              loading="lazy"
              sizes="100vw"
              style={{ width: '100%', height: 'auto' }}
              priority={false}
            />
          </div>
          {/* Tabs */}
          <div className="mt-7.5 px-5 pb-5">
            <div className="flex items-center gap-3 flex-wrap">
              {(
                [
                  { id: 'pre', label: '🔥 Pre-Registration' },
                  { id: 'whale', label: '🐳 Whale Boost' },
                  { id: 'hold', label: '💰 Hold & Earn' },
                  { id: 'dao', label: '📝 DAO Participation' },
                ] as Array<{ id: 'pre' | 'whale' | 'hold' | 'dao'; label: string }>
              ).map((t) => {
                const isActive = aprTab === t.id;
                return (
                  <Button
                    key={t.id}
                    size="sm"
                    variant={isActive ? 'white' : 'black'}
                    className={[
                      '!rounded-full px-5 py-3.5 text-base font-semibold leading-[1]',
                      !isActive ? '!bg-[#1c1c1c] !text-[#9c9c9c]' : '!text-black',
                    ].join(' ')}
                    onClick={() => setAprTab(t.id)}
                    aria-pressed={isActive}
                  >
                    {t.label}
                  </Button>
                );
              })}
            </div>
          </div>
          {/* APR Journey Content */}
          {aprTab === 'pre' && (
            <div className="px-5 pb-7.5">
              <div className="text-white text-base leading-[20px] tracking-[0] font-semibold">
                <span className="mr-1">🔥</span>
                <span>Pre-Registration: Bring your buddy, Boost the APR, Earn together!</span>
              </div>
              {/* Progress track */}
              {(() => {
                const wallets = Math.max(0, Math.min(1000, totalPreRegisteredWallets || 0));
                const progressPercent = (wallets / 1000) * 100;
                const formattedTotalWallets = wallets >= 1000 ? '1,000+' : wallets.toLocaleString();
                const steps = [10, 12, 14, 16, 18, 20] as const;
                // Calculate CUTOFF_PERCENT same as pre-registration page
                const CUTOFF_PERCENT =
                  wallets >= 1000
                    ? 20
                    : (() => {
                        const idx = Math.max(0, Math.min(4, Math.floor(Math.max(0, wallets - 1) / 200)));
                        return (10 + idx * 2) as 10 | 12 | 14 | 16 | 18 | 20;
                      })();
                return (
                  <div className="mt-10 overflow-visible">
                    {/* Progress track */}
                    <div className="relative overflow-visible">
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
                        style={{
                          left: `${Math.max(
                            1,
                            Math.min(
                              // Responsive max value: 96 for small screens, 97 for medium, 99 for large
                              isNarrow600 ? 96 : isNarrow900 ? 97 : 99,
                              progressPercent
                            )
                          )}%`,
                          transform: 'translateX(-50%)',
                        }}
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
                  </div>
                );
              })()}
              {/* Rows */}
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
                  const wallets = Math.max(0, Math.min(1000, totalPreRegisteredWallets || 0));
                  const steps = [10, 12, 14, 16, 18, 20] as const;
                  const currentRangeIdx = wallets >= 1000 ? 5 : Math.floor(Math.max(0, wallets - 1) / 200);
                  // Calculate CUTOFF_PERCENT same as pre-registration page
                  const CUTOFF_PERCENT =
                    wallets >= 1000
                      ? 20
                      : (() => {
                          const idx = Math.max(0, Math.min(4, Math.floor(Math.max(0, wallets - 1) / 200)));
                          return (10 + idx * 2) as 10 | 12 | 14 | 16 | 18 | 20;
                        })();
                  const cutoffIdx = Math.max(0, steps.indexOf(CUTOFF_PERCENT));
                  return rows.map((row, idx) => {
                    const leftActive = idx <= currentRangeIdx;
                    const rightActive = idx <= cutoffIdx;
                    return (
                      <React.Fragment key={idx}>
                        <div className={idx === rows.length - 1 ? '' : 'mb-5'}>
                          <div
                            className={[
                              'inline-block font-bold text-sm px-3 py-2 rounded',
                              leftActive ? 'bg-[#5DF23F] text-black' : 'bg-white text-black',
                            ].join(' ')}
                          >
                            {row.range}
                          </div>
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
                            <span>{`${row.desc} = ${
                              isNarrow600
                                ? row.apr.replace('APR ', '').replace(/\s*\((Base|Max)\)\s*/g, '')
                                : row.apr.replace('APR ', '')
                            }`}</span>
                          </div>
                          <div
                            className={[
                              'mt-2 text-sm hidden min-[600px]:block',
                              leftActive ? 'text-[#5DF23F]' : 'text-white/80',
                            ].join(' ')}
                          >
                            {row.desc}
                          </div>
                        </div>
                        <div
                          className={[
                            'hidden min-[600px]:flex items-center justify-end gap-1',
                            idx === rows.length - 1 ? '' : 'mb-5',
                          ].join(' ')}
                        >
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
          )}
          {aprTab === 'whale' && (
            <div className="px-5 pb-7.5">
              <div className="text-white text-base leading-[20px] tracking-[0] font-semibold mb-4">
                <span className="mr-1">🐳</span>
                <span>Whale Boost: The more you stake, the higher your APR</span>
              </div>
              <div className="grid grid-cols-3 gap-3 bg-[#2D2D2D] text-[#bfbfbf] rounded-[5px] px-4 py-2 text-base font-semibold">
                <div className="text-left">Tier</div>
                <div className="text-center">HPP Amount</div>
                <div className="text-right">Bonus Credit</div>
              </div>
              <div className="space-y-1">
                {[
                  { tier: 'Tier 1', amount: '≥ 10,000', bonus: 'x101%' },
                  { tier: 'Tier 2', amount: '≥ 50,000', bonus: 'x103%' },
                  { tier: 'Tier 3', amount: '≥ 100,000', bonus: 'x105%' },
                  { tier: 'Tier 4', amount: '≥ 300,000', bonus: 'x107%' },
                  { tier: 'Tier 5', amount: '≥ 500,000', bonus: 'x110%' },
                  { tier: 'Tier 6', amount: '≥ 1,000,000', bonus: 'x115%' },
                ].map((r, idx, arr) => (
                  <div
                    key={r.tier}
                    className={[
                      'grid grid-cols-3 gap-3 items-center px-2 py-3',
                      idx !== arr.length - 1 ? 'border-b border-[#2D2D2D]' : '',
                    ].join(' ')}
                  >
                    <div className="text-left">
                      <span className="inline-block bg-[#5DF23F] text-black text-sm font-bold px-3 py-1.5 rounded">
                        {r.tier}
                      </span>
                    </div>
                    <div className="text-white text-base text-center leading-[1] tracking-[0] font-normal">
                      {r.amount}
                    </div>
                    <div className="text-right text-[#5DF23F] text-base font-semibold leading-[1] tracking-[0] pr-6">
                      {r.bonus}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(aprTab === 'hold' || aprTab === 'dao') && (
            <div className="px-5 pb-7.5">
              <div className="rounded-[5px] bg-[#1c1c1c] px-5 py-7.5">
                <div className="text-[#9c9c9c] text-base leading-[20px] tracking-[0] font-semibold">Coming Soon</div>
              </div>
            </div>
          )}
        </div>
        {/* APR Calculator */}
        <AprCalculator showPreRegistrationNote={true} />

        {/* FAQ */}
        <FaqSection items={stakingData.staking.faq} className="mt-37.5 max-w-6xl mx-auto w-full" />
      </div>
    </div>
  );
}
