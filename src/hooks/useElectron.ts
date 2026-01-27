import { useState, useEffect } from 'react';

interface UseElectronReturn {
  isElectron: boolean;
  version: string;
  showNotification: (title: string, body: string) => void;
  saveData: (data: any) => Promise<string | void>;
  loadData: () => Promise<any>;
  platform: string;
}

export const useElectron = (): UseElectronReturn => {
  const [isElectron, setIsElectron] = useState<boolean>(false);
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    // Electron 환경 확인
    if (window.isElectron) {
      setIsElectron(true);
      
      // 앱 버전 가져오기
      window.electronAPI?.getVersion().then(setVersion);
    }
  }, []);

  const showNotification = (title: string, body: string): void => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.showNotification(title, body);
    } else {
      // 웹 환경에서는 브라우저 알림 사용
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    }
  };

  const saveData = async (data: any): Promise<string | void> => {
    if (isElectron && window.electronAPI) {
      const result = await window.electronAPI.showSaveDialog();
      if (!result.canceled && result.filePath) {
        // 파일 저장 로직 (추후 구현)
        return result.filePath;
      }
    } else {
      // 웹 환경에서는 다운로드로 처리
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'shifthealth-data.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const loadData = async (): Promise<any> => {
    if (isElectron && window.electronAPI) {
      const result = await window.electronAPI.showOpenDialog();
      if (!result.canceled && result.filePaths.length > 0) {
        // 파일 로드 로직 (추후 구현)
        return result.filePaths[0];
      }
    } else {
      // 웹 환경에서는 파일 입력으로 처리
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result;
              if (typeof result === 'string') {
                resolve(JSON.parse(result));
              }
            };
            reader.readAsText(file);
          }
        };
        input.click();
      });
    }
  };

  return {
    isElectron,
    version,
    showNotification,
    saveData,
    loadData,
    platform: window.electronAPI?.platform || 'web'
  };
};