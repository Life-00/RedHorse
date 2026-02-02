import { Amplify } from "aws-amplify";

export function configureAmplify() {
  const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
  const userPoolClientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID;

  console.log("🔍 Amplify 설정 시작...");
  console.log("User Pool ID:", userPoolId);
  console.log("Client ID:", userPoolClientId);

  if (!userPoolId || !userPoolClientId) {
    console.error("❌ Cognito 환경 변수 누락!");
    console.error("VITE_COGNITO_USER_POOL_ID:", userPoolId);
    console.error("VITE_COGNITO_USER_POOL_CLIENT_ID:", userPoolClientId);
    console.error("개발 서버를 재시작하세요: npm run dev");
    return;
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
      },
    },
  });

  console.log("✅ Amplify 설정 완료!");
}
