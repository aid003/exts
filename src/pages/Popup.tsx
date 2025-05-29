import { useEffect, useState } from "react";
import browser from "webextension-polyfill";
import type { HhTokenResponse } from "../types";
import "./Popup.css";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; token: HhTokenResponse }
  | { status: "error"; message: string };

export default function Popup(): JSX.Element {
  const [state, setState] = useState<State>({ status: "idle" });

  // При монтировании читаем сохранённый токен
  useEffect(() => {
    browser.storage.local.get("hhToken").then((res) => {
      if (res.hhToken) {
        setState({ status: "done", token: res.hhToken as HhTokenResponse });
      }
    });
  }, []);

  const handleClick = async (): Promise<void> => {
    setState({ status: "loading" });
    const resp = (await browser.runtime.sendMessage({ cmd: "oauth" })) as
      | { ok: true; token: HhTokenResponse }
      | { ok: false; error: string };

    if (resp.ok) {
      setState({ status: "done", token: resp.token });
    } else {
      setState({ status: "error", message: resp.error });
    }
  };

  return (
    <div className="page">
      <h1>HH OAuth Helper</h1>
      <button onClick={handleClick} disabled={state.status === "loading"}>
        {state.status === "done" ? "Обновить токены" : "Получить токены"}
      </button>

      {state.status === "loading" && <p>Ожидание авторизации…</p>}
      {state.status === "error" && (
        <p className="error">Ошибка: {state.message}</p>
      )}
      {state.status === "done" && (
        <div className="tokens">
          <p>
            <strong>Access Token:</strong> {state.token.access_token}
          </p>
          <p>
            <strong>Refresh Token:</strong> {state.token.refresh_token}
          </p>
          <p>
            <strong>Expires In:</strong> {state.token.expires_in}
          </p>
          <p>
            <strong>Created At:</strong>{" "}
            {new Date(state.token.created_at * 1000).toLocaleString()}
          </p>
          <p>
            <strong>Token Type:</strong> {state.token.token_type}
          </p>
        </div>
      )}
    </div>
  );
}
