import { signIn } from 'next-auth/react';
import Head from 'next/head';
import { Button } from '~/components/ui/button';
import Image from 'next/image';
import { type GetServerSideProps } from 'next';
import { getServerAuthSession } from '~/server/auth';
import { useState } from 'react';
import { Input } from '~/components/ui/input';
import { Separator } from '~/components/ui/separator';
import { env } from '~/env';

export default function Home() {
  const callbackUrl = env.NEXT_PUBLIC_URL;

  const [email, setEmail] = useState('');
  const [magicCode, setMagicCode] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  async function sendMagicLink() {
    setEmailStatus('sending');
    const res = await signIn('email', { email: email.toLowerCase(), redirect: false });
    setEmailStatus('success');
  }

  async function submitMagicCode() {
    window.location.href = `/api/auth/callback/email?email=${encodeURIComponent(
      email,
    )}&token=${magicCode}${callbackUrl ? `&callbackUrl=${callbackUrl}` : ''}`;
  }

  return (
    <>
      <Head>
        <title>SplitPro: Split Expenses with your friends for free</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex h-full flex-col justify-center">
        <div className="flex -translate-y-1/2 flex-col items-center">
          <div className="mb-10 flex items-center gap-4">
            <Image src="../logo.svg" alt="logo" className="rounded-full" width={40} height={40} />
            <p className="text-2xl font-bold">SplitPro</p>
          </div>
          <Button
            className="mx-auto flex w-[300px] items-center gap-2 bg-white hover:bg-gray-100 focus:bg-gray-100"
            onClick={() => signIn('google')}
          >
            <Image
              alt="Google logo"
              loading="lazy"
              height="15"
              width="15"
              id="provider-logo-dark"
              src="https://authjs.dev/img/providers/google.svg"
            />
            Continue with Google
          </Button>
          <div className="mt-6 flex w-[300px]  items-center justify-between gap-2">
            <p className=" z-10 ml-[150px] -translate-x-1/2 bg-background px-4 text-sm">or</p>
            <div className="absolute h-[1px] w-[300px]  bg-gradient-to-r from-zinc-800 via-zinc-300 to-zinc-800"></div>
          </div>
          {emailStatus === 'success' ? (
            <>
              <p className="mt-6 w-[300px] text-center text-sm">
                We have sent an email with the OTP. Please check your inbox
              </p>
              <Input
                placeholder="Enter magic code"
                className="mt-6 w-[300px] text-lg"
                value={magicCode}
                onChange={(e) => setMagicCode(e.target.value)}
              />
              <Button
                className="mt-6 w-[300px] bg-white hover:bg-gray-100 focus:bg-gray-100"
                onClick={submitMagicCode}
                disabled={magicCode.length !== 5}
              >
                Submit
              </Button>
            </>
          ) : (
            <>
              <Input
                placeholder="Enter your email"
                className="mt-6 w-[300px] text-lg"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                className="mt-6 w-[300px] bg-white hover:bg-gray-100 focus:bg-gray-100"
                onClick={sendMagicLink}
                disabled={emailStatus === 'sending'}
              >
                {emailStatus === 'sending' ? 'Sending...' : 'Send magic link'}
              </Button>
            </>
          )}
        </div>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerAuthSession(context);

  if (session) {
    return {
      redirect: {
        destination: '/balances',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};