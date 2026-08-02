/**
 * Alert Center Component
 * Displays portfolio alerts and notifications
 */

import { useEffect, useState } from 'react';
import { portfolioAlertsService, type Alert } from '../../utils/portfolioAlertsService';
import { portfolioStorage } from '../../utils/portfolioStorage';

interface AlertCenterProps {
  onDismiss?: (alertId: string) => void;
}

export default function AlertCenter({ onDismiss }: AlertCenterProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        await portfolioStorage.init();
        const portfolio = await portfolioStorage.getPortfolio('default');

        if (!portfolio || portfolio.holdings.length === 0) return;

        const stats = await portfolioStorage.getPortfolioStats('default');

        // Generate alerts
        const newAlerts = portfolioAlertsService.generateAlerts({
          holdings: stats.holdings,
          sectors: stats.holdings.map((h: any) => ({
            sector: h.ticker,
            allocation: h.allocation,
          })),
          currentReturn: stats.totalReturnPercent,
        });

        // Filter dismissed alerts
        const visibleAlerts = newAlerts.filter((a) => !dismissedAlerts.has(a.id));
        setAlerts(visibleAlerts);
      } catch (error) {
        console.error('Failed to load alerts:', error);
      }
    };

    loadAlerts();
    const interval = setInterval(loadAlerts, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [dismissedAlerts]);

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, alertId]));
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    if (onDismiss) onDismiss(alertId);
  };

  if (alerts.length === 0) return null;

  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  const warningAlerts = alerts.filter((a) => a.severity === 'warning');
  const infoAlerts = alerts.filter((a) => a.severity === 'info');

  return (
    <div
      style={{
        padding: '12px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#fafafa',
        marginBottom: '16px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>🔔 Alerts ({alerts.length})</div>
        {alerts.length > 0 && (
          <button
            onClick={() => setAlerts([])}
            style={{
              fontSize: '12px',
              padding: '4px 8px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#f0f0f0',
              cursor: 'pointer',
            }}
          >
            Clear All
          </button>
        )}
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          {criticalAlerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                padding: '10px',
                backgroundColor: '#fce8e6',
                border: '1px solid #ea4335',
                borderRadius: '4px',
                marginBottom: '6px',
                cursor: 'pointer',
              }}
              onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#9c0000', marginBottom: '2px' }}>
                    🔴 {alert.title}
                  </div>
                  {expandedId === alert.id && (
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                      {alert.message}
                      {alert.action && (
                        <div style={{ marginTop: '6px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismiss(alert.id);
                            }}
                            style={{
                              fontSize: '11px',
                              padding: '4px 8px',
                              backgroundColor: '#ea4335',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                            }}
                          >
                            Take Action
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss(alert.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ea4335',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginLeft: '8px',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warning Alerts */}
      {warningAlerts.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          {warningAlerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                padding: '10px',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '4px',
                marginBottom: '6px',
                cursor: 'pointer',
              }}
              onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#856404', marginBottom: '2px' }}>
                    🟡 {alert.title}
                  </div>
                  {expandedId === alert.id && (
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                      {alert.message}
                      {alert.action && (
                        <div style={{ marginTop: '6px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismiss(alert.id);
                            }}
                            style={{
                              fontSize: '11px',
                              padding: '4px 8px',
                              backgroundColor: '#ffc107',
                              color: '#000',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                            }}
                          >
                            Review
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss(alert.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ffc107',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginLeft: '8px',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Alerts */}
      {infoAlerts.length > 0 && (
        <div>
          {infoAlerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                padding: '10px',
                backgroundColor: '#e3f2fd',
                border: '1px solid #2196f3',
                borderRadius: '4px',
                marginBottom: '6px',
                cursor: 'pointer',
              }}
              onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#1565c0', marginBottom: '2px' }}>
                    ℹ️ {alert.title}
                  </div>
                  {expandedId === alert.id && (
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                      {alert.message}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss(alert.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2196f3',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginLeft: '8px',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
