import { signUp, confirmSignUp, signIn, signOut, fetchAuthSession, resendSignUpCode } from "aws-amplify/auth";

export async function authIsSignedIn(): Promise<boolean> {
  try {
    const s = await fetchAuthSession();
    return Boolean(s.tokens?.idToken);
  } catch {
    return false;
  }
}

export async function authSignUp(params: { email: string; password: string; name: string }) {
  return signUp({
    username: params.email, // 새로운 User Pool에서는 이메일을 username으로 사용 가능
    password: params.password,
    options: {
      userAttributes: {
        email: params.email,
        name: params.name,
      },
    },
  });
}

export async function authConfirmSignUp(params: { email: string; code: string }) {
  return confirmSignUp({
    username: params.email,
    confirmationCode: params.code,
  });
}

export async function authSignIn(params: { email: string; password: string }) {
  return signIn({
    username: params.email,
    password: params.password,
  });
}

export async function authSignOut() {
  await signOut();
}

export async function authResendSignUpCode(params: { email: string }) {
  return resendSignUpCode({
    username: params.email,
  });
}
