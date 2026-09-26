import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import SpTrongTamView from "@/components/SpTrongTamView";
import { getSaleDetailData, buildSptt, resolveSpttRange } from "@/lib/sale-detail";
import { todayInVN } from "@/lib/report-utils";

import { TEN_NHOM_HIEN_THI } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function SpTrongTamPage({
  searchParams,
}: {
  searchParams: Promise<{ tu?: string; den?: string }>;
}) {
  const session = await auth();
  const user = session!.user!;
  const sp = await searchParams;

  const data = await getSaleDetailData();
  const range = resolveSpttRange({ tu: sp.tu, den: sp.den }, todayInVN());
  const sptt = buildSptt(data, range.nowFromMs, range.nowToMs, range.prevFromMs, range.prevToMs);

  return (
    <>
      <AppHeader hoTen={user.name ?? ""} role="manager" active="sp-trong-tam" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <SpTrongTamView teamName={TEN_NHOM_HIEN_THI} sptt={sptt} range={range} />
      </main>
    </>
  );
}
