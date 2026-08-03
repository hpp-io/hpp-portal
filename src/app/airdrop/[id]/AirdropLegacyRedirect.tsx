'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

/** Client redirect for legacy `/airdrop/{uuid}/` URLs (`output: export` cannot use server `redirect()`). */
export default function AirdropLegacyRedirect({ to }: { to: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <DotLottieReact src="/lotties/Loading.lottie" autoplay loop style={{ width: 48, height: 48 }} />
    </div>
  );
}
