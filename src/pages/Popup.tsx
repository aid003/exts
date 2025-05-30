import { useEffect, useState } from "react";
import browser from "webextension-polyfill";
import type { HhTokenResponse } from "../types";
import SystemAuth from "./Auth/SystemAuth";
import "./Popup.css";

type HhAuthState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; token: HhTokenResponse }
  | { status: "error"; message: string };

export default function Popup(): JSX.Element {
  const [isSystemAuthenticated, setIsSystemAuthenticated] = useState(false);
  const [hhAuth, setHhAuth] = useState<HhAuthState>({ status: "idle" });

  // При монтировании проверяем системную авторизацию и токен HH
  useEffect(() => {
    // Проверяем системную авторизацию
    browser.storage.local.get("systemAuth").then((res) => {
      if (res.systemAuth) {
        setIsSystemAuthenticated(true);
      }
    });

    // Проверяем токен HH
    browser.storage.local.get("hhToken").then((res) => {
      if (res.hhToken) {
        setHhAuth({ status: "done", token: res.hhToken as HhTokenResponse });
      }
    });
  }, []);

  const handleHhAuth = async (): Promise<void> => {
    setHhAuth({ status: "loading" });
    const resp = (await browser.runtime.sendMessage({ cmd: "oauth" })) as
      | { ok: true; token: HhTokenResponse }
      | { ok: false; error: string };

    if (resp.ok) {
      setHhAuth({ status: "done", token: resp.token });
    } else {
      setHhAuth({ status: "error", message: resp.error });
    }
  };

  return (
    <div className="page">
      <h1>Система авторизации</h1>
      
      {!isSystemAuthenticated ? (
        <SystemAuth onAuthSuccess={() => setIsSystemAuthenticated(true)} />
      ) : (
        <div className="auth-section">
          <h2>Шаг 2: Авторизация в HH</h2>
          <button 
            onClick={handleHhAuth} 
            disabled={hhAuth.status === "loading"}
          >
            {hhAuth.status === "done" ? "Обновить токены HH" : "Получить токены HH"}
          </button>

          {hhAuth.status === "loading" && <p>Ожидание авторизации в HH…</p>}
          {hhAuth.status === "error" && (
            <p className="error">Ошибка: {hhAuth.message}</p>
          )}
          {hhAuth.status === "done" && (
            <div className="tokens">
              <p>
                <strong>Access Token:</strong> {hhAuth.token.access_token}
              </p>
              <p>
                <strong>Refresh Token:</strong> {hhAuth.token.refresh_token}
              </p>
              <p>
                <strong>Expires In:</strong> {hhAuth.token.expires_in}
              </p>
              <p>
                <strong>Created At:</strong>{" "}
                {new Date(hhAuth.token.created_at * 1000).toLocaleString()}
              </p>
              <p>
                <strong>Token Type:</strong> {hhAuth.token.token_type}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
