/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AWS_REGION: string;
  readonly VITE_COGNITO_USER_POOL_ID: string;
  readonly VITE_COGNITO_USER_POOL_CLIENT_ID: string;

  // 아래는 지금은 안 쓰지만 네가 갖고 있는 변수라 선언만 해둠
  readonly VITE_COGNITO_DOMAIN?: string;
  readonly VITE_OAUTH_REDIRECT_SIGNIN?: string;
  readonly VITE_OAUTH_REDIRECT_SIGNOUT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
