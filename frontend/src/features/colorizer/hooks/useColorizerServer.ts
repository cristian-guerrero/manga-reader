import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@shared/components';
import { ColorizerAPI } from '@services/api/colorizerAPI';
import type { colorizer } from '../../../../wailsjs/go/models';

export function useColorizerServer() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [status, setStatus] = useState<colorizer.InstallProgress>({
    status: 'not_installed',
    message: t('colorizer.status.not_installed'),
    percent: 0,
  });
  const [isStarting, setIsStarting] = useState(false);
  const [isServerRunning, setIsServerRunning] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const s = await ColorizerAPI.getStatus();
        if (!s) return;
        setStatus(s);

        if (s.status === 'running') {
          setIsServerRunning(true);
          setIsStarting(false);
        } else if (s.status === 'ready' || s.status === 'not_installed') {
          setIsServerRunning(false);
        }

        if (s.status === 'error' && s.error) {
          showToast(s.error, 'error');
          setIsStarting(false);
        }
      } catch {
        // Ignore
      }
    };

    poll();
    pollRef.current = setInterval(poll, 500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [showToast, t]);

  const startServer = useCallback(async () => {
    try {
      setIsStarting(true);
      if (status.status === 'not_installed' || status.status === 'error') {
        showToast(t('colorizer.firstTimeSetup'), 'warning');
      }
      await ColorizerAPI.startServer();
      showToast(t('colorizer.status.starting_server'), 'info');
    } catch {
      setIsStarting(false);
    }
  }, [showToast, t, status.status]);

  const stopServer = useCallback(async () => {
    try {
      await ColorizerAPI.stopServer();
      setIsServerRunning(false);
      showToast(t('colorizer.status.stopping'), 'info');
    } catch {
      // Ignore
    }
  }, [showToast, t]);

  return {
    status,
    isServerRunning,
    isStarting,
    startServer,
    stopServer,
  };
}
