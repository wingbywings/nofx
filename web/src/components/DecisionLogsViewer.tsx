import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../i18n/translations';
import { api } from '../lib/api';
import type { DecisionRecord } from '../types';

interface DecisionLogsViewerProps {
  traderId: string;
}

export default function DecisionLogsViewer({ traderId }: DecisionLogsViewerProps) {
  const { language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSuccess, setFilterSuccess] = useState<'all' | 'success' | 'failed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // 获取所有决策日志
  const { data: allDecisions, error, isLoading } = useSWR<DecisionRecord[]>(
    traderId ? `decisions-all-${traderId}` : null,
    () => api.getDecisions(traderId),
    {
      refreshInterval: 30000, // 30秒刷新
      revalidateOnFocus: false,
      dedupingInterval: 20000,
    }
  );

  // 过滤和搜索
  const filteredDecisions = useMemo(() => {
    if (!allDecisions) return [];

    let filtered = allDecisions;

    // 按成功/失败过滤
    if (filterSuccess === 'success') {
      filtered = filtered.filter((d) => d.success);
    } else if (filterSuccess === 'failed') {
      filtered = filtered.filter((d) => !d.success);
    }

    // 搜索过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((d) => {
        return (
          d.cycle_number.toString().includes(term) ||
          (d.timestamp && d.timestamp.toLowerCase().includes(term)) ||
          (d.decisions && d.decisions.some((action) => action.symbol?.toLowerCase().includes(term))) ||
          (d.cot_trace && d.cot_trace.toLowerCase().includes(term)) ||
          (d.input_prompt && d.input_prompt.toLowerCase().includes(term))
        );
      });
    }

    // 按时间倒序排列（最新的在前）
    return filtered.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [allDecisions, searchTerm, filterSuccess]);

  // 分页
  const totalPages = Math.ceil(filteredDecisions.length / itemsPerPage);
  const paginatedDecisions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredDecisions.slice(start, end);
  }, [filteredDecisions, currentPage, itemsPerPage]);

  if (error) {
    return (
      <div className="binance-card p-6">
        <div style={{ color: '#F6465D' }}>{t('loadingError', language)}</div>
      </div>
    );
  }

  return (
    <div className="binance-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#EAECEF' }}>
            📋 {t('allDecisionLogs', language)}
          </h2>
          {allDecisions && (
            <div className="text-sm mt-1" style={{ color: '#848E9C' }}>
              {t('totalDecisions', language, { count: allDecisions.length })}
              {searchTerm || filterSuccess !== 'all' ? (
                <span className="ml-2">
                  ({t('filtered', language, { count: filteredDecisions.length })})
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder={t('searchDecisions', language)}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
            className="w-full px-4 py-2 rounded text-sm"
            style={{
              background: '#1E2329',
              border: '1px solid #2B3139',
              color: '#EAECEF',
            }}
          />
        </div>

        {/* Filter by Success */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setFilterSuccess('all');
              setCurrentPage(1);
            }}
            className="px-4 py-2 rounded text-sm font-semibold transition-all"
            style={
              filterSuccess === 'all'
                ? { background: '#F0B90B', color: '#000' }
                : { background: '#1E2329', color: '#848E9C', border: '1px solid #2B3139' }
            }
          >
            {t('all', language)}
          </button>
          <button
            onClick={() => {
              setFilterSuccess('success');
              setCurrentPage(1);
            }}
            className="px-4 py-2 rounded text-sm font-semibold transition-all"
            style={
              filterSuccess === 'success'
                ? { background: '#0ECB81', color: '#000' }
                : { background: '#1E2329', color: '#848E9C', border: '1px solid #2B3139' }
            }
          >
            {t('success', language)}
          </button>
          <button
            onClick={() => {
              setFilterSuccess('failed');
              setCurrentPage(1);
            }}
            className="px-4 py-2 rounded text-sm font-semibold transition-all"
            style={
              filterSuccess === 'failed'
                ? { background: '#F6465D', color: '#000' }
                : { background: '#1E2329', color: '#848E9C', border: '1px solid #2B3139' }
            }
          >
            {t('failed', language)}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12" style={{ color: '#848E9C' }}>
          <div className="text-4xl mb-4">⏳</div>
          <div>{t('loading', language)}</div>
        </div>
      )}

      {/* Decisions List */}
      {!isLoading && paginatedDecisions.length > 0 ? (
        <>
          <div className="space-y-4 mb-6">
            {paginatedDecisions.map((decision) => (
              <DecisionLogCard key={decision.cycle_number} decision={decision} language={language} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t" style={{ borderColor: '#2B3139' }}>
              <div className="text-sm" style={{ color: '#848E9C' }}>
                {t('showing', language, {
                  start: (currentPage - 1) * itemsPerPage + 1,
                  end: Math.min(currentPage * itemsPerPage, filteredDecisions.length),
                  total: filteredDecisions.length,
                })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={
                    currentPage === 1
                      ? { background: '#1E2329', color: '#848E9C', border: '1px solid #2B3139' }
                      : { background: '#1E2329', color: '#EAECEF', border: '1px solid #2B3139' }
                  }
                >
                  {t('previous', language)}
                </button>
                <div
                  className="px-4 py-2 rounded text-sm font-semibold"
                  style={{ background: '#1E2329', color: '#EAECEF', border: '1px solid #2B3139' }}
                >
                  {currentPage} / {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={
                    currentPage === totalPages
                      ? { background: '#1E2329', color: '#848E9C', border: '1px solid #2B3139' }
                      : { background: '#1E2329', color: '#EAECEF', border: '1px solid #2B3139' }
                  }
                >
                  {t('next', language)}
                </button>
              </div>
            </div>
          )}
        </>
      ) : !isLoading ? (
        <div className="text-center py-12" style={{ color: '#848E9C' }}>
          <div className="text-6xl mb-4 opacity-50">📋</div>
          <div className="text-lg font-semibold mb-2">{t('noDecisionsFound', language)}</div>
          <div className="text-sm">
            {searchTerm || filterSuccess !== 'all'
              ? t('tryDifferentFilters', language)
              : t('noDecisionsYet', language)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Decision Log Card Component (简化版，用于列表展示)
function DecisionLogCard({
  decision,
  language,
}: {
  decision: DecisionRecord;
  language: 'en' | 'zh';
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded p-5 transition-all duration-300 cursor-pointer hover:translate-y-[-2px]"
      style={{
        border: '1px solid #2B3139',
        background: '#1E2329',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-semibold text-lg" style={{ color: '#EAECEF' }}>
            {t('cycle', language)} #{decision.cycle_number}
          </div>
          <div className="text-xs mt-1" style={{ color: '#848E9C' }}>
            {new Date(decision.timestamp).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="px-3 py-1 rounded text-xs font-bold"
            style={
              decision.success
                ? { background: 'rgba(14, 203, 129, 0.1)', color: '#0ECB81' }
                : { background: 'rgba(246, 70, 93, 0.1)', color: '#F6465D' }
            }
          >
            {t(decision.success ? 'success' : 'failed', language)}
          </div>
          <div className="text-xs" style={{ color: '#848E9C' }}>
            {expanded ? '▼' : '▶'}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-4 text-sm mb-3" style={{ color: '#848E9C' }}>
        <span>
          💰 {t('equity', language)}: {decision.account_state?.total_balance?.toFixed(2) || '0.00'} USDT
        </span>
        <span>
          📊 {t('positions', language)}: {decision.account_state?.position_count || 0}
        </span>
        <span>
          🎯 {t('actions', language)}: {decision.decisions?.length || 0}
        </span>
        {decision.decisions && decision.decisions.length > 0 && (
          <span>
            💱 {decision.decisions.map((d) => d.symbol).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
          </span>
        )}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: '#2B3139' }}>
          {/* Input Prompt */}
          {decision.input_prompt && (
            <div className="mb-4">
              <div className="text-sm font-semibold mb-2" style={{ color: '#60a5fa' }}>
                📥 {t('inputPrompt', language)}
              </div>
              <div
                className="rounded p-3 text-xs font-mono whitespace-pre-wrap overflow-y-auto"
                style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF', maxHeight: '400px' }}
              >
                {decision.input_prompt}
              </div>
            </div>
          )}

          {/* AI Chain of Thought */}
          {decision.cot_trace && (
            <div className="mb-4">
              <div className="text-sm font-semibold mb-2" style={{ color: '#F0B90B' }}>
                📤 {t('aiThinking', language)}
              </div>
              <div
                className="rounded p-3 text-xs font-mono whitespace-pre-wrap overflow-y-auto"
                style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF', maxHeight: '400px' }}
              >
                {decision.cot_trace}
              </div>
            </div>
          )}

          {/* Decisions Actions */}
          {decision.decisions && decision.decisions.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-semibold mb-2" style={{ color: '#EAECEF' }}>
                {t('actions', language)}
              </div>
              <div className="space-y-2">
                {decision.decisions.map((action, j) => (
                  <div
                    key={j}
                    className="flex items-center gap-2 text-sm rounded px-3 py-2"
                    style={{ background: '#0B0E11' }}
                  >
                    <span className="font-mono font-bold" style={{ color: '#EAECEF' }}>
                      {action.symbol}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold"
                      style={
                        action.action.includes('open')
                          ? { background: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa' }
                          : { background: 'rgba(240, 185, 11, 0.1)', color: '#F0B90B' }
                      }
                    >
                      {action.action}
                    </span>
                    {action.leverage > 0 && (
                      <span style={{ color: '#F0B90B' }}>{action.leverage}x</span>
                    )}
                    {action.price > 0 && (
                      <span className="font-mono text-xs" style={{ color: '#848E9C' }}>
                        @{action.price.toFixed(4)}
                      </span>
                    )}
                    <span style={{ color: action.success ? '#0ECB81' : '#F6465D' }}>
                      {action.success ? '✓' : '✗'}
                    </span>
                    {action.error && (
                      <span className="text-xs ml-2" style={{ color: '#F6465D' }}>
                        {action.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Account State */}
          {decision.account_state && (
            <div className="mb-4">
              <div className="text-sm font-semibold mb-2" style={{ color: '#EAECEF' }}>
                {t('accountState', language)}
              </div>
              <div
                className="rounded p-3 text-xs grid grid-cols-2 gap-2"
                style={{ background: '#0B0E11', border: '1px solid #2B3139' }}
              >
                <div>
                  <span style={{ color: '#848E9C' }}>{t('totalEquity', language)}: </span>
                  <span style={{ color: '#EAECEF' }}>
                    {decision.account_state.total_balance?.toFixed(2) || '0.00'} USDT
                  </span>
                </div>
                <div>
                  <span style={{ color: '#848E9C' }}>{t('availableBalance', language)}: </span>
                  <span style={{ color: '#EAECEF' }}>
                    {decision.account_state.available_balance?.toFixed(2) || '0.00'} USDT
                  </span>
                </div>
                <div>
                  <span style={{ color: '#848E9C' }}>{t('margin', language)}: </span>
                  <span style={{ color: '#EAECEF' }}>
                    {decision.account_state.margin_used_pct?.toFixed(1) || '0.0'}%
                  </span>
                </div>
                <div>
                  <span style={{ color: '#848E9C' }}>{t('positions', language)}: </span>
                  <span style={{ color: '#EAECEF' }}>
                    {decision.account_state.position_count || 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Execution Logs */}
          {decision.execution_log && decision.execution_log.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-semibold mb-2" style={{ color: '#EAECEF' }}>
                {t('executionLog', language)}
              </div>
              <div className="space-y-1">
                {decision.execution_log.map((log, k) => (
                  <div
                    key={k}
                    className="text-xs font-mono px-3 py-1 rounded"
                    style={{
                      color:
                        log.includes('✓') || log.includes('成功') ? '#0ECB81' : '#F6465D',
                      background: '#0B0E11',
                    }}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {decision.error_message && (
            <div
              className="text-sm rounded px-3 py-2"
              style={{ color: '#F6465D', background: 'rgba(246, 70, 93, 0.1)' }}
            >
              ❌ {decision.error_message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

