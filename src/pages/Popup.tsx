import { useEffect, useState } from "react";
import browser from "webextension-polyfill";
import type { HhTokenResponse } from "../types";
import SystemAuth from "./Auth/SystemAuth";
import HhAuth from "./Auth/HhAuth";
import TokenDisplay from "./Display/TokenDisplay";
import "./Popup.css";

export default function Popup(): JSX.Element {
  const [isSystemAuthenticated, setIsSystemAuthenticated] = useState(false);
  const [hhToken, setHhToken] = useState<HhTokenResponse | null>(null);
  const [showTokenDisplay, setShowTokenDisplay] = useState(false);

  useEffect(() => {
    console.log("[Popup] Component mounted");
    
    // Загружаем все состояния из storage при монтировании
    browser.storage.local.get(["systemAuth", "hhToken", "showTokenDisplay"]).then((res) => {
      console.log("[Popup] Initial storage state:", res);
      if (res.systemAuth) {
        setIsSystemAuthenticated(true);
      }
      if (res.hhToken) {
        setHhToken(res.hhToken as HhTokenResponse);
      }
      if (res.showTokenDisplay) {
        setShowTokenDisplay(true);
      }
    });

    // Слушаем изменения в storage
    const handleStorageChange = (changes: { [key: string]: browser.Storage.StorageChange }) => {
      console.log("[Popup] Storage changes:", changes);
      
      if ('systemAuth' in changes) {
        const newValue = changes.systemAuth?.newValue;
        console.log("[Popup] Setting systemAuth to:", newValue);
        setIsSystemAuthenticated(!!newValue);
      }
      if (changes.hhToken?.newValue === undefined) {
        setHhToken(null);
      }
      if ('showTokenDisplay' in changes) {
        const newValue = changes.showTokenDisplay?.newValue;
        console.log("[Popup] Setting showTokenDisplay to:", newValue);
        setShowTokenDisplay(!!newValue);
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      console.log("[Popup] Component unmounting");
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const handleHhAuthSuccess = async (token: HhTokenResponse) => {
    console.log("[Popup] HH Auth success with token:", token);
    
    // Сначала сохраняем в storage
    await browser.storage.local.set({ 
      hhToken: token,
      showTokenDisplay: true 
    });
    
    // Затем обновляем состояние
    setHhToken(token);
    setShowTokenDisplay(true);
  };

  const handleGetNewTokens = async () => {
    console.log("[Popup] Getting new tokens");
    
    // Сначала сохраняем в storage
    await browser.storage.local.set({ 
      showTokenDisplay: false,
      hhToken: null 
    });
    
    // Затем обновляем состояние
    setShowTokenDisplay(false);
    setHhToken(null);
  };

  console.log("[Popup] Rendering with state:", { 
    isSystemAuthenticated, 
    hhToken: hhToken ? 'exists' : 'null', 
    showTokenDisplay 
  });

  return (
    <div className="page">
      <h1>Система авторизации</h1>
      
      {!isSystemAuthenticated ? (
        <SystemAuth onAuthSuccess={() => setIsSystemAuthenticated(true)} />
      ) : showTokenDisplay && hhToken ? (
        <TokenDisplay 
          token={hhToken}
          onContinue={handleGetNewTokens}
        />
      ) : (
        <HhAuth onAuthSuccess={handleHhAuthSuccess} />
      )}
    </div>
  );
}
