import type { HhTokenResponse } from "../../types";
import "./TokenDisplay.css";

interface TokenDisplayProps {
  token: HhTokenResponse;
  onContinue: (token: HhTokenResponse) => void;
}

export default function TokenDisplay({ token, onContinue }: TokenDisplayProps): JSX.Element {
  return (
    <div className="token-display">
      <p className="success-message">Токены успешно получены:</p>
      <div className="tokens-container">
        <p>
          <strong>Access Token:</strong> {token.access_token}
        </p>
        <p>
          <strong>Refresh Token:</strong> {token.refresh_token}
        </p>
        <p>
          <strong>Expires In:</strong> {token.expires_in}
        </p>
        <p>
          <strong>Created At:</strong> {token.created_at}
        </p>
        <p>
          <strong>Token Type:</strong> {token.token_type}
        </p>
        <button 
          onClick={() => {
            console.log("[TokenDisplay] Continue button clicked with token:", token);
            onContinue(token);
          }}
          className="continue-button"
        >
          Продолжить
        </button>
      </div>
    </div>
  );
} 