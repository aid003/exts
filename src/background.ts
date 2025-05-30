import browser from "webextension-polyfill";
import type { HhTokenResponse } from "./types";

const CLIENT_ID =
  "HIOMIAS39CA9DICTA7JIO64LQKQJF5AGIK74G9ITJKLNEDAOH5FHS5G1JI7FOEGD";
const CLIENT_SECRET =
  "V9M870DE342BGHFRUJ5FTCGCUA1482AN0DI8C5TFI9ULMA89H10N60NOP8I4JMVS";
const REDIRECT_URI = "hhandroid://oauthresponse";

let extensionWindowId: number | null = null;

/**
 * Открываем окно расширения
 */
async function openExtensionWindow() {
  // Если окно уже открыто, фокусируемся на нем
  if (extensionWindowId !== null) {
    try {
      const window = await browser.windows.get(extensionWindowId);
      if (window) {
        await browser.windows.update(extensionWindowId, { focused: true });
        return;
      }
    } catch (e) {
      // Если окно не найдено, сбрасываем ID
      extensionWindowId = null;
    }
  }

  // Создаем новое окно
  const window = await browser.windows.create({
    url: browser.runtime.getURL("src/popup.html"),
    type: "popup",
    width: 400,
    height: 600,
    focused: true
  });

  if (window.id !== undefined) {
    extensionWindowId = window.id;
  }

  // Слушаем закрытие окна
  browser.windows.onRemoved.addListener((windowId) => {
    if (windowId === extensionWindowId) {
      extensionWindowId = null;
    }
  });
}

/**
 * 1. Открываем окно авторизации и ловим 302-редирект с code=…
 */
async function getAuthCode(): Promise<string> {
  const authUrl =
    "https://hh.ru/oauth/authorize?" +
    new URLSearchParams({ client_id: CLIENT_ID, response_type: "code" });

  console.log("[hh-oauth] open", authUrl);

  const created = await browser.tabs.create({ url: authUrl, active: true });
  if (created.id === undefined) {
    throw new Error("Tab ID is undefined — cannot track redirect");
  }
  const tabId = created.id;

  return new Promise<string>((resolve, reject) => {
    const filter = {
      urls: ["*://*.hh.ru/oauth/authorize*"],
      tabId,
    };

    const onRedirect: Parameters<
      typeof browser.webRequest.onBeforeRedirect.addListener
    >[0] = (details) => {
      const loc = details.redirectUrl ?? "";
      console.log("[hh-oauth] REDIRECT →", loc);

      if (!loc.startsWith(REDIRECT_URI)) return;
      cleanup();

      const code = new URL(loc).searchParams.get("code");
      if (code) {
        // Закрываем вкладку перед resolve
        browser.tabs.remove(tabId).catch(() => void 0);
        resolve(code);
      } else {
        // Закрываем вкладку перед reject
        browser.tabs.remove(tabId).catch(() => void 0);
        reject(new Error("code not found"));
      }
    };

    const onRemoved = (closed: number): void => {
      if (closed === tabId) {
        cleanup();
        reject(new Error("Auth window closed"));
      }
    };

    const cleanup = () => {
      browser.webRequest.onBeforeRedirect.removeListener(onRedirect);
      browser.tabs.onRemoved.removeListener(onRemoved);
    };

    browser.webRequest.onBeforeRedirect.addListener(onRedirect, filter);
    browser.tabs.onRemoved.addListener(onRemoved);
  });
}

/**
 * 2. Обмениваем code → полный объект токена
 */
async function exchangeToken(code: string): Promise<HhTokenResponse> {
  const res = await fetch("https://hh.ru/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as HhTokenResponse;
}

/**
 * 3. Главный слушатель сообщений от UI
 */
browser.runtime.onMessage.addListener(async (message) => {
  if (message.cmd === "open") {
    await openExtensionWindow();
    return { ok: true };
  }

  if (message.cmd === "oauth") {
    try {
      const code = await getAuthCode();
      const token = await exchangeToken(code);

      console.log("[hh-oauth] access_token ", token.access_token);
      console.log("[hh-oauth] refresh_token", token.refresh_token);
      console.log("[hh-oauth] expires_in", token.expires_in);

      // проставляем время создания токена
      const now = Math.floor(Date.now() / 1000);
      const fullTok = { ...token, created_at: now };

      // сохраняем весь объект в storage.local
      await browser.storage.local.set({ hhToken: fullTok });

      return { ok: true, token: fullTok };
    } catch (e) {
      console.error("[hh-oauth] error", e);
      return { ok: false, error: String(e) };
    }
  }
});

// Обработчик клика по иконке расширения
browser.action.onClicked.addListener(() => {
  openExtensionWindow();
});

console.log("HH OAuth background ready");
