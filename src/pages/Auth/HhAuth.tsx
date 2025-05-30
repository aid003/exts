import { useState } from "react";
import browser from "webextension-polyfill";
import type { HhTokenResponse } from "../../types";
import "./HhAuth.css";

interface HhAuthProps {
  onAuthSuccess: (token: HhTokenResponse) => void;
}

type HhAuthState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "sending" }
  | { status: "done"; token: HhTokenResponse }
  | { status: "error"; message: string };

export default function HhAuth({ onAuthSuccess }: HhAuthProps): JSX.Element {
  const [state, setState] = useState<HhAuthState>({ status: "idle" });

  const clearStorage = async (): Promise<void> => {
    try {
      // Сначала проверим что есть в storage
      const currentStorage = await browser.storage.local.get(null);
      console.log("[HhAuth] Current storage before clearing:", currentStorage);

      // Удаляем только токены HH, сохраняя системную авторизацию
      await browser.storage.local.remove(["hhToken", "showTokenDisplay"]);

      // Проверяем что осталось
      const afterStorage = await browser.storage.local.get(null);
      console.log("[HhAuth] Storage after clearing:", afterStorage);
    } catch (error) {
      console.error("[HhAuth] Error clearing storage:", error);
      throw error;
    }
  };

  const sendTokensToServer = async (token: HhTokenResponse): Promise<void> => {
    try {
      const { systemToken } = await browser.storage.local.get("systemToken");
      if (!systemToken) {
        throw new Error("Системный токен не найден");
      }

      console.log("[HhAuth] Sending tokens to server...");
      // const response = await fetch("https://api.example.com/tokens", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     "Authorization": `Bearer ${systemToken}`
      //   },
      //   body: JSON.stringify({
      //     systemToken,
      //     accessToken: token.access_token,
      //     refreshToken: token.refresh_token,
      //     expiresIn: token.expires_in,
      //     createdAt: token.created_at,
      //   }),
      // });

      // if (!response.ok) {
      //   throw new Error(`Ошибка отправки на сервер: ${response.statusText}`);
      // }

      console.log("[HhAuth] Tokens sent successfully, clearing storage");
      await clearStorage();
      
    } catch (error: unknown) {
      console.error("[HhAuth] Error in sendTokensToServer:", error);
      if (error instanceof Error) {
        throw new Error(`Ошибка при отправке токенов: ${error.message}`);
      }
      throw new Error('Ошибка при отправке токенов');
    }
  };

  const handleHhAuth = async (): Promise<void> => {
    setState({ status: "loading" });
    try {
      const resp = (await browser.runtime.sendMessage({ cmd: "oauth" })) as
        | { ok: true; token: HhTokenResponse }
        | { ok: false; error: string };

      console.log("[HhAuth] Got response:", resp);

      if (resp.ok) {
        setState({ status: "sending" });
        try {
          await sendTokensToServer(resp.token);
          console.log("[HhAuth] All operations completed successfully");
          setState({ status: "done", token: resp.token });
          // Небольшая задержка перед вызовом onAuthSuccess, чтобы убедиться что все обновилось
          setTimeout(() => {
            onAuthSuccess(resp.token);
          }, 500);
        } catch (error) {
          console.error("[HhAuth] Error in sendTokensToServer:", error);
          setState({ status: "error", message: String(error) });
        }
      } else {
        console.error("[HhAuth] Response not ok:", resp.error);
        setState({ status: "error", message: resp.error });
      }
    } catch (error) {
      console.error("[HhAuth] Error in handleHhAuth:", error);
      setState({ status: "error", message: String(error) });
    }
  };

  const getButtonText = () => {
    switch (state.status) {
      case "sending":
        return "Отправка токенов...";
      case "done":
        return "Обновить токены HH";
      default:
        return "Получить токены HH";
    }
  };

  return (
    <div className="auth-section">
      <h2>Шаг 2: Авторизация в HH</h2>
      <button 
        onClick={handleHhAuth} 
        disabled={state.status === "loading" || state.status === "sending"}
      >
        {getButtonText()}
      </button>

      {state.status === "loading" && <p>Ожидание авторизации в HH…</p>}
      {state.status === "sending" && <p>Отправка токенов на сервер...</p>}
      {state.status === "error" && (
        <p className="error">Ошибка: {state.message}</p>
      )}
    </div>
  );
} 