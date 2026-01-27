import { Amplify } from "aws-amplify";

export function configureAmplify() {
  const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
  const userPoolClientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID;

  if (!userPoolId || !userPoolClientId) {
    console.warn("⚠️ env 누락: VITE_COGNITO_USER_POOL_ID / VITE_COGNITO_USER_POOL_CLIENT_ID");
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
}
