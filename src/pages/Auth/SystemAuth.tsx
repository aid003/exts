import { useState } from "react";
import browser from "webextension-polyfill";
import "./SystemAuth.css";

type SystemAuthState = 
  | { status: "idle" }
  | { status: "loading" }
  | { status: "authenticated"; token: string }
  | { status: "error"; message: string };

interface SystemAuthProps {
  onAuthSuccess: (token: string) => void;
}

export default function SystemAuth({ onAuthSuccess }: SystemAuthProps): JSX.Element {
  const [state, setState] = useState<SystemAuthState>({ status: "idle" });
  const [tokenInput, setTokenInput] = useState("");

  const handleAuth = async (): Promise<void> => {
    if (!tokenInput.trim()) {
      setState({ status: "error", message: "Введите токен авторизации" });
      return;
    }

    setState({ status: "loading" });
    try {
      // Имитация запроса к серверу
      const response = await new Promise<{ success: boolean; message?: string }>((resolve) => {
        setTimeout(() => {
          // Случайный ответ для демонстрации разных сценариев
          const random = Math.random();
          if (random < 0.3) {
            resolve({ success: false, message: "Неверный токен авторизации" });
          } else if (random < 0.4) {
            resolve({ success: false, message: "Сервер недоступен" });
          } else {
            resolve({ success: true });
          }
        }, 1000);
      });

      if (!response.success) {
        throw new Error(response.message || "Ошибка авторизации");
      }
      
      // Сохраняем статус авторизации и токен
      await browser.storage.local.set({ 
        systemAuth: true,
        systemToken: tokenInput 
      });
      setState({ status: "authenticated", token: tokenInput });
      onAuthSuccess(tokenInput);
    } catch (e) {
      setState({ status: "error", message: String(e) });
    }
  };

  return (
    <div className="auth-section">
      <h2>Шаг 1: Авторизация в системе</h2>
      <p>Получить токен авторизации можно <a href="https://t.me/milliondollarontags_bot" target="_blank" rel="noopener noreferrer">тут</a></p>
      <div className="auth-form">
        <input
          type="text"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder="Введите токен авторизации из tg"
          disabled={state.status === "loading"}
          className="token-input"
        />
        <button 
          onClick={handleAuth} 
          disabled={state.status === "loading" || !tokenInput.trim()}
        >
          {state.status === "loading" ? "Авторизация..." : "Войти в систему"}
        </button>
      </div>
      {state.status === "error" && (
        <p className="error">Ошибка: {state.message}</p>
      )}
      {state.status === "authenticated" && (
        <p className="success">Авторизация успешна</p>
      )}
    </div>
  );
} 