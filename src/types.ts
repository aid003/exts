export interface HhTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: "bearer";
  created_at: number;
  [k: string]: unknown;
}
