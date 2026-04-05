'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Metric,
  Badge,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Select,
  SelectItem,
  Grid,
  Col,
} from '@tremor/react';

// ── Types ────────────────────────────────────────────────────────────────────

interface OpenTrade {
  asset: string;
  direction: 'LONG' | 'SHORT';
  entry: number;
  stop_loss: number;
  tp1: number;
  tp2: number;
  live_pnl: number;
  is_break_even: boolean;
}

interface ClosedTrade {
  date: string;
  asset: string;
  session: string;
  direction: 'LONG' | 'SHORT';
  entry: number;
  risk_usd: number;
}

interface DashboardData {
  realized_pnl: number;
  win_rate: number;
  open_trades: OpenTrade[];
  trades: ClosedTrade[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type TimeFilter = '24h' | 'week' | 'month' | 'year' | 'all';

function filterTrades(trades: ClosedTrade[], filter: TimeFilter): ClosedTrade[] {
  if (filter === 'all') return trades;
  const now = Date.now();
  const cutoff: Record<Exclude<TimeFilter, 'all'>, number> = {
    '24h': 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  };
  return trades.filter(
    (t) => now - new Date(t.date).getTime() <= cutoff[filter as Exclude<TimeFilter, 'all'>]
  );
}

function fmtCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function fmtPct(value: number): string {
  return `${(value * 100).toFixed(1)} %`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  const API_URL = process.env.NEXT_PUBLIC_API_URL!;
  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN!;

  async function fetchData() {
    try {
      const res = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: DashboardData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredTrades = data ? filterTrades(data.trades ?? [], timeFilter) : [];

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">APEX Trading Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Live data · auto-refresh every 60 s</p>
        </div>
        {error && (
          <Badge color="red" size="lg">
            API Error: {error}
          </Badge>
        )}
        {!data && !error && (
          <Badge color="yellow" size="lg">
            Loading…
          </Badge>
        )}
      </div>

      {/* KPI Cards */}
      <Grid numItemsMd={3} className="gap-4">
        <Col>
          <Card className="bg-slate-800 border-slate-700">
            <Text className="text-slate-400">Realized P&amp;L</Text>
            <Metric className={data && data.realized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
              {data ? fmtCurrency(data.realized_pnl) : '—'}
            </Metric>
          </Card>
        </Col>
        <Col>
          <Card className="bg-slate-800 border-slate-700">
            <Text className="text-slate-400">Win Rate</Text>
            <Metric className="text-blue-400">{data ? fmtPct(data.win_rate) : '—'}</Metric>
          </Card>
        </Col>
        <Col>
          <Card className="bg-slate-800 border-slate-700">
            <Text className="text-slate-400">
              Trades ({timeFilter === 'all' ? 'Alle' : timeFilter})
            </Text>
            <Metric className="text-slate-100">{data ? filteredTrades.length : '—'}</Metric>
          </Card>
        </Col>
      </Grid>

      {/* Live Trades */}
      <Card className="bg-slate-800 border-slate-700">
        <Title className="text-slate-100 mb-4">Live Trades</Title>
        {data && data.open_trades?.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell className="text-slate-400">Asset</TableHeaderCell>
                <TableHeaderCell className="text-slate-400">Richtung</TableHeaderCell>
                <TableHeaderCell className="text-slate-400">Entry</TableHeaderCell>
                <TableHeaderCell className="text-slate-400">Stop-Loss</TableHeaderCell>
                <TableHeaderCell className="text-slate-400">TP1</TableHeaderCell>
                <TableHeaderCell className="text-slate-400">TP2</TableHeaderCell>
                <TableHeaderCell className="text-slate-400">Live P&amp;L</TableHeaderCell>
                <TableHeaderCell className="text-slate-400">Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.open_trades.map((trade, i) => (
                <TableRow key={i} className="border-slate-700">
                  <TableCell className="font-semibold text-slate-100">{trade.asset}</TableCell>
                  <TableCell>
                    <Badge color={trade.direction === 'LONG' ? 'green' : 'red'}>
                      {trade.direction}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-200">{trade.entry}</TableCell>
                  <TableCell className="text-red-400 font-medium">{trade.stop_loss}</TableCell>
                  <TableCell className="text-green-400">{trade.tp1}</TableCell>
                  <TableCell className="text-green-400">{trade.tp2}</TableCell>
                  <TableCell
                    className={
                      trade.live_pnl >= 0
                        ? 'text-green-400 font-medium'
                        : 'text-red-400 font-medium'
                    }
                  >
                    {fmtCurrency(trade.live_pnl)}
                  </TableCell>
                  <TableCell>
                    <Badge color={trade.is_break_even ? 'green' : 'yellow'}>
                      {trade.is_break_even ? 'Über Break-Even' : 'Im Risiko'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Text className="text-slate-400 italic">Keine offenen Trades.</Text>
        )}
      </Card>

      {/* Trade History */}
      <Card className="bg-slate-800 border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <Title className="text-slate-100">Trade Historie</Title>
          <Select
            value={timeFilter}
            onValueChange={(v) => setTimeFilter(v as TimeFilter)}
            className="w-44"
          >
            <SelectItem value="24h">Letzte 24h</SelectItem>
            <SelectItem value="week">Woche</SelectItem>
            <SelectItem value="month">Monat</SelectItem>
            <SelectItem value="year">Jahr</SelectItem>
            <SelectItem value="all">Alle</SelectItem>
          </Select>
        </div>
        {filteredTrades.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell className="text-slate-400">Datum</TableHeaderCell>
                <TableHeaderCell className="text-slate-400">Asset</TableHeaderCell>
                <TableHeaderCell className="text-slate-400">Session</TableHeaderCell>
                <TableHeaderCell className="text-slate-400">Richtung</TableHeaderCell>
                <TableHeaderCell className="text-slate-400">Entry</TableHeaderCell>
                <TableHeaderCell className="text-slate-400">Risk ($)</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTrades.map((trade, i) => (
                <TableRow key={i} className="border-slate-700">
                  <TableCell className="text-slate-300">
                    {new Date(trade.date).toLocaleDateString('de-DE')}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-100">{trade.asset}</TableCell>
                  <TableCell className="text-slate-300">{trade.session}</TableCell>
                  <TableCell>
                    <Badge color={trade.direction === 'LONG' ? 'green' : 'red'}>
                      {trade.direction}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-200">{trade.entry}</TableCell>
                  <TableCell className="text-slate-200">{fmtCurrency(trade.risk_usd)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Text className="text-slate-400 italic">Keine Trades im gewählten Zeitraum.</Text>
        )}
      </Card>
    </main>
  );
}
